-- Xóa tất cả user cũ
DELETE FROM Users;

-- Tạo admin mới
INSERT INTO Users (Username, Password, Role, FullName)
VALUES ('admin', '$2a$11$rG7L5T8Q8Y8Y8Y8Y8Y8OZuQ5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q', 'Admin', 'Quan ly');

-- Kiểm tra
SELECT * FROM Users;

PRINT 'Da reset users';
