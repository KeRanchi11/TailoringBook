<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "tailoringbook";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    error_log("Connection failed: " . $conn->connect_error);
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Connection failed: " . $conn->connect_error]);
    exit();
}

$conn->set_charset("utf8mb4");

function sendResponse($data, $statusCode = 200) {
    global $conn;
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    $conn->close();
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['action'])) {
            sendResponse(["success" => false, "message" => "Action is required"], 400);
        }

        if ($data['action'] === 'add_customer') {
            if (!isset($data['name']) || empty(trim($data['name']))) {
                sendResponse(["success" => false, "message" => "Customer name is required"], 400);
            }

            $name = trim($data['name']);
            
            // بررسی وجود مشتری با همین نام
            $stmt = $conn->prepare("SELECT id FROM customers WHERE name = ?");
            $stmt->bind_param("s", $name);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows > 0) {
                sendResponse(["success" => false, "message" => "مشتری با این نام قبلاً ثبت شده است"], 400);
            }
            $stmt->close();

            $stmt = $conn->prepare("INSERT INTO customers (name) VALUES (?)");
            $stmt->bind_param("s", $name);

            if ($stmt->execute()) {
                $customer_id = $conn->insert_id;
                sendResponse([
                    "success" => true,
                    "message" => "Customer added successfully",
                    "customer_id" => $customer_id
                ]);
            } else {
                error_log("Error adding customer: " . $conn->error);
                sendResponse(["success" => false, "message" => "Error adding customer: " . $conn->error], 500);
            }
            $stmt->close();
        } elseif ($data['action'] === 'save_measurements') {
            if (!isset($data['customer_id']) || !isset($data['clothing_type_id']) || !isset($data['measurements'])) {
                sendResponse(["success" => false, "message" => "Customer ID, clothing type ID, and measurements are required"], 400);
            }

            $customer_id = (int)$data['customer_id'];
            $clothing_type_id = (int)$data['clothing_type_id'];
            $measurements = $data['measurements'];

            $stmt = $conn->prepare(
                "SELECT measurement_id FROM clothing_measurements WHERE clothing_type_id = ?"
            );
            $stmt->bind_param("i", $clothing_type_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $valid_measurement_ids = [];
            while ($row = $result->fetch_assoc()) {
                $valid_measurement_ids[] = $row['measurement_id'];
            }
            $stmt->close();

            foreach ($measurements as $measurement) {
                if (!isset($measurement['measurement_id']) || !isset($measurement['value'])) {
                    continue;
                }

                $measurement_id = (int)$measurement['measurement_id'];
                $value = $measurement['value'] !== '' ? (float)$measurement['value'] : null;

                if (!in_array($measurement_id, $valid_measurement_ids)) {
                    continue;
                }

                $stmt = $conn->prepare(
                    "SELECT id FROM measurements WHERE customer_id = ? AND clothing_type_id = ? AND measurement_id = ?"
                );
                $stmt->bind_param("iii", $customer_id, $clothing_type_id, $measurement_id);
                $stmt->execute();
                $result = $stmt->get_result();

                if ($result->num_rows > 0) {
                    $stmt = $conn->prepare(
                        "UPDATE measurements SET value = ? WHERE customer_id = ? AND clothing_type_id = ? AND measurement_id = ?"
                    );
                    $stmt->bind_param("diii", $value, $customer_id, $clothing_type_id, $measurement_id);
                } else {
                    $stmt = $conn->prepare(
                        "INSERT INTO measurements (customer_id, clothing_type_id, measurement_id, value) VALUES (?, ?, ?, ?)"
                    );
                    $stmt->bind_param("iiid", $customer_id, $clothing_type_id, $measurement_id, $value);
                }

                if (!$stmt->execute()) {
                    error_log("Error saving measurement: " . $conn->error);
                    sendResponse(["success" => false, "message" => "Error saving measurement: " . $conn->error], 500);
                }
                $stmt->close();
            }

            sendResponse(["success" => true, "message" => "Measurements saved successfully"]);
        } else {
            sendResponse(["success" => false, "message" => "Invalid action"], 400);
        }
        break;

    case 'GET':
        if (isset($_GET['customer_id']) && isset($_GET['clothing_type_id'])) {
            $customer_id = (int)$_GET['customer_id'];
            $clothing_type_id = (int)$_GET['clothing_type_id'];

            // دریافت اندازه‌های پیش‌فرض از clothing_measurements
            $stmt = $conn->prepare(
                "SELECT measurements_list.name, measurements_list.id 
                 FROM clothing_measurements 
                 JOIN measurements_list ON clothing_measurements.measurement_id = measurements_list.id 
                 WHERE clothing_measurements.clothing_type_id = ?"
            );
            $stmt->bind_param("i", $clothing_type_id);
            $stmt->execute();
            $result = $stmt->get_result();

            $default_measurements = [];
            while ($row = $result->fetch_assoc()) {
                $default_measurements[$row['id']] = ["name" => $row['name'], "value" => null];
            }
            $stmt->close();

            // دریافت اندازه‌های ثبت‌شده از measurements
            $stmt = $conn->prepare(
                "SELECT measurements_list.name, measurements.value, measurements.measurement_id 
                 FROM measurements 
                 JOIN measurements_list ON measurements.measurement_id = measurements_list.id 
                 WHERE measurements.customer_id = ? AND measurements.clothing_type_id = ?"
            );
            $stmt->bind_param("ii", $customer_id, $clothing_type_id);
            $stmt->execute();
            $result = $stmt->get_result();

            // ادغام اندازه‌های ثبت‌شده با اندازه‌های پیش‌فرض
            while ($row = $result->fetch_assoc()) {
                if (isset($default_measurements[$row['measurement_id']])) {
                    $default_measurements[$row['measurement_id']]['value'] = $row['value'];
                }
            }
            $stmt->close();

            $measurements = array_values($default_measurements);
            sendResponse(["success" => true, "measurements" => $measurements]);
        } else {
            $customers = [];
            $result = $conn->query("SELECT id, name FROM customers");
            if ($result === false) {
                error_log("Customers query failed: " . $conn->error);
                sendResponse(["success" => false, "message" => "Customers query failed: " . $conn->error], 500);
            }
            while ($row = $result->fetch_assoc()) {
                $customers[] = $row;
            }

            $clothing_types = [];
            $result = $conn->query("SELECT id, name FROM clothing_type LIMIT 6");
            if ($result === false) {
                error_log("Clothing types query failed: " . $conn->error);
                sendResponse(["success" => false, "message" => "Clothing types query failed: " . $conn->error], 500);
            }
            while ($row = $result->fetch_assoc()) {
                $clothing_types[] = $row;
            }

            sendResponse([
                "success" => true,
                "customers" => $customers,
                "clothing_types" => $clothing_types
            ]);
        }
        break;

    default:
        sendResponse(["success" => false, "message" => "Method not allowed"], 405);
}

$conn->close();
?>