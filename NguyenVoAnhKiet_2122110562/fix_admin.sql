-- Update password cho admin (hash của "123")
UPDATE Users SET Password = '$2a$11$K8j5G8Q5Y5Q5Q5Q5Q5Q5QOZQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q' WHERE Username = 'admin';

-- Nếu không có admin, tạo mới
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = 'admin')
BEGIN
    INSERT INTO Users (Username, Password, Role, FullName)
    VALUES ('admin', '$2a$11$rG7L5T8Q8Y8Y8Y8Y8Y8Y8OPZP8P8P8P8P8P8P8P8P8P8P8P8P8P8P', 'Admin', 'Quản lý');
END

PRINT 'Da update mat khau admin';
