-- Xóa tất cả user cũ
DELETE FROM Users;
DBCC CHECKIDENT ('Users', RESEED, 0);

-- Insert admin với hash đúng cho password "123"
INSERT INTO Users (Username, Password, Role, FullName)
VALUES ('admin', '$2a$11$8K1qxJ5S9A8B7C6D5E4F3G5H6I7J8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3', 'Admin', 'Quan ly');

SELECT * FROM Users;
