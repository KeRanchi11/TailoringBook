import React, { useState, useEffect } from 'react';
import { Form, Button, Accordion, Card, Alert } from 'react-bootstrap';
import '../styles/CustomerManager.css';

const CustomerManager = () => {
    const [customers, setCustomers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [newCustomerName, setNewCustomerName] = useState('');
    const [clothingTypes, setClothingTypes] = useState([]);
    const [customerMeasurements, setCustomerMeasurements] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [inputError, setInputError] = useState('');

    const [editingMeasurements, setEditingMeasurements] = useState({});

    const API_URL = 'http://localhost/TailoringBook/src/backend/CustomerManager.php';

    useEffect(() => {
        fetchCustomersAndClothingTypes();
    }, []);

    const fetchCustomersAndClothingTypes = async () => {
        try {
            const response = await fetch(API_URL, { method: 'GET' });
            const text = await response.text();
            console.log('Fetch customers and clothing types response:', text);
            const data = text ? JSON.parse(text) : {};
            if (response.ok && data.success) {
                setCustomers(data.customers || []);
                setClothingTypes(data.clothing_types || []);
                setErrorMessage('');
            } else {
                setErrorMessage(data.message || 'خطا در دریافت اطلاعات');
            }
        } catch (error) {
            setErrorMessage('خطا در اتصال به سرور: ' + error.message);
        }
    };

    const addCustomer = async () => {
        if (newCustomerName.trim() === '') {
            setInputError('لطفاً نام مشتری را وارد کنید! 🥰');
            return;
        }

        setInputError(''); // پاک کردن خطا در صورت وجود
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add_customer', name: newCustomerName }),
            });
            const text = await response.text();
            console.log('Add customer response:', text);
            const data = text ? JSON.parse(text) : {};
            if (response.ok && data.success) {
                setCustomers([...customers, { id: data.customer_id, name: newCustomerName }]);
                setNewCustomerName('');
                setErrorMessage('');
            } else {
                setErrorMessage(data.message || 'خطا در افزودن مشتری');
            }
        } catch (error) {
            setErrorMessage('خطا در افزودن مشتری: ' + error.message);
        }
    };

    const fetchMeasurements = async (customerId, clothingTypeId) => {
        const key = `${customerId}-${clothingTypeId}`;
        try {
            const response = await fetch(`${API_URL}?customer_id=${customerId}&clothing_type_id=${clothingTypeId}`, { method: 'GET' });
            const text = await response.text();
            console.log(`Fetch measurements response for customer ${customerId} and clothing type ${clothingTypeId}:`, text);
            const data = text ? JSON.parse(text) : {};
            if (response.ok && data.success) {
                const measurements = data.measurements || [];
                console.log('Measurements received:', measurements);
                const editingValues = {};
                measurements.forEach(m => {
                    editingValues[m.name] = m.value !== null ? m.value : '';
                });
                setCustomerMeasurements({ ...customerMeasurements, [key]: measurements });
                setEditingMeasurements({ ...editingMeasurements, [key]: editingValues });
                setErrorMessage('');
            } else {
                setErrorMessage(data.message || 'خطا در دریافت اندازه‌ها');
                setCustomerMeasurements({ ...customerMeasurements, [key]: [] });
                setEditingMeasurements({ ...editingMeasurements, [key]: {} });
            }
        } catch (error) {
            setErrorMessage('خطا در دریافت اندازه‌ها: ' + error.message);
            setCustomerMeasurements({ ...customerMeasurements, [key]: [] });
            setEditingMeasurements({ ...editingMeasurements, [key]: {} });
        }
    };

    const handleMeasurementChange = (key, measurementName, value) => {
        setEditingMeasurements({
            ...editingMeasurements,
            [key]: {
                ...editingMeasurements[key],
                [measurementName]: value,
            },
        });
    };

    const saveMeasurements = async (customerId, clothingTypeId) => {
        const key = `${customerId}-${clothingTypeId}`;
        const measurementsToSave = customerMeasurements[key].map(m => {
            const measurementId = measurements_list.find(ml => ml.name === m.name)?.id;
            if (!measurementId) {
                console.error(`Measurement ID not found for name: ${m.name}`);
                return null;
            }
            return { measurement_id: measurementId, value: editingMeasurements[key][m.name] || null };
        }).filter(m => m !== null);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_measurements',
                    customer_id: customerId,
                    clothing_type_id: clothingTypeId,
                    measurements: measurementsToSave,
                }),
            });
            const text = await response.text();
            console.log('Save measurements response:', text);
            const data = text ? JSON.parse(text) : {};
            if (response.ok && data.success) {
                await fetchMeasurements(customerId, clothingTypeId);
                setErrorMessage('');
            } else {
                setErrorMessage(data.message || 'خطا در ذخیره اندازه‌ها');
            }
        } catch (error) {
            setErrorMessage('خطا در ذخیره اندازه‌ها: ' + error.message);
        }
    };

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const [activeClothingMeasurement, setActiveClothingMeasurement] = useState({});

    const measurements_list = [
        { id: 1, name: 'دور گردن' },
        { id: 2, name: 'سرشانه' },
        { id: 3, name: 'دور سینه' },
        { id: 4, name: 'قد سینه' },
        { id: 5, name: 'فاصله سینه' },
        { id: 6, name: 'قد بالاتنه جلو' },
        { id: 7, name: 'قد بالا تنه پشت' },
        { id: 8, name: 'کارور جلو' },
        { id: 9, name: 'کارور پشت' },
        { id: 10, name: 'دور باسن' },
        { id: 11, name: 'قد باسن' },
        { id: 12, name: 'قد آستین' },
        { id: 13, name: 'دور مچ' },
        { id: 14, name: 'دور بازو' },
        { id: 15, name: 'قد کت' },
        { id: 16, name: 'قد مانتو' },
        { id: 17, name: 'قد شومیز' },
        { id: 18, name: 'قد تاپ' },
        { id: 19, name: 'قد لباس مجلسی' },
        { id: 20, name: 'دور آکاردمان' },
        { id: 21, name: 'قد آکاردمان' },
        { id: 22, name: 'دور کمر' },
        { id: 23, name: 'قد دامن' },
        { id: 24, name: 'قد شلوار' },
        { id: 25, name: 'قد فاق' },
        { id: 26, name: 'دور ران' },
        { id: 27, name: 'قد دور مچ پا' },
        { id: 28, name: 'دور زانو' },
        { id: 29, name: 'قد زانو' },
    ];

    return (
        <div className="container mt-5">
            {errorMessage && <Alert variant="danger" className="text-center">{errorMessage}</Alert>}
            {inputError && <Alert variant="warning" className="text-center">{inputError}</Alert>}
            <div className="d-flex gap-3 mb-4">
                <div className="position-relative flex-grow-1">
                    <Form.Control
                        type="text"
                        placeholder="جستجو بر اساس نام مشتری"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="custom-input"
                    />
                </div>
                <div className="position-relative flex-grow-1">
                    <Form.Control
                        type="text"
                        placeholder="اضافه کردن مشتری"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        className="custom-input"
                        onKeyPress={(e) => e.key === 'Enter' && addCustomer()}
                    />
                    <Button className="floating-button" variant="primary" onClick={addCustomer}>
                        اضافه کردن
                    </Button>
                </div>
            </div>
            <Accordion>
                {filteredCustomers.map((customer) => (
                    <Accordion.Item eventKey={customer.id.toString()} key={customer.id}>
                        <Accordion.Header className="accordion-header">
                            <div className="d-flex justify-content-between align-items-center w-100">
                                <span>{customer.name}</span>
                                <div>
                                    {clothingTypes.map((clothingType) => (
                                        <span
                                            key={clothingType.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fetchMeasurements(customer.id, clothingType.id);
                                                setActiveClothingMeasurement({
                                                    ...activeClothingMeasurement,
                                                    [customer.id]: clothingType.id,
                                                });
                                            }}
                                            className="ms-2 btn btn-secondary"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {clothingType.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </Accordion.Header>
                        <Accordion.Body>
                            <Card.Body>
                                {activeClothingMeasurement[customer.id] ? (
                                    customerMeasurements[`${customer.id}-${activeClothingMeasurement[customer.id]}`]?.length > 0 ? (
                                        <>
                                            {customerMeasurements[`${customer.id}-${activeClothingMeasurement[customer.id]}`].map((measurement, index) => (
                                                <div key={index} className="mb-2 d-flex align-items-center">
                                                    <Form.Label className="me-2 mb-0" style={{ width: '150px' }}>
                                                        {measurement.name}:
                                                    </Form.Label>
                                                    <Form.Control
                                                        type="number"
                                                        value={editingMeasurements[`${customer.id}-${activeClothingMeasurement[customer.id]}`]?.[measurement.name] || ''}
                                                        onChange={(e) =>
                                                            handleMeasurementChange(
                                                                `${customer.id}-${activeClothingMeasurement[customer.id]}`,
                                                                measurement.name,
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="مقدار را وارد کنید"
                                                        style={{ width: '150px' }}
                                                    />
                                                </div>
                                            ))}
                                            <Button
                                                variant="success"
                                                onClick={() =>
                                                    saveMeasurements(customer.id, activeClothingMeasurement[customer.id])
                                                }
                                                className="mt-3"
                                            >
                                                ذخیره اندازه‌ها
                                            </Button>
                                        </>
                                    ) : (
                                        <p>هیچ اندازه‌ای برای این نوع لباس یافت نشد. لطفاً دیتابیس را بررسی کنید.</p>
                                    )
                                ) : (
                                    <p>لطفاً برای دیدن اندازه‌ها، روی دکمه نوع لباس کلیک کنید.</p>
                                )}
                            </Card.Body>
                        </Accordion.Body>
                    </Accordion.Item>
                ))}
                {filteredCustomers.length === 0 && searchQuery && (
                    <div className="text-center mt-3">مشتری با نام "{searchQuery}" یافت نشد.</div>
                )}
                {customers.length === 0 && !searchQuery && (
                    <div className="text-center mt-3">هیچ مشتری ثبت نشده است.</div>
                )}
            </Accordion>
        </div>
    );
};

export default CustomerManager;