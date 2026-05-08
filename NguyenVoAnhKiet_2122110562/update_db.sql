-- Thêm cột FullName vào bảng Users
ALTER TABLE Users ADD FullName NVARCHAR(MAX) NULL;

-- Thêm cột CreatedBy, CreatedByName vào bảng Bills
ALTER TABLE Bills ADD CreatedBy INT NULL;
ALTER TABLE Bills ADD CreatedByName NVARCHAR(MAX) NULL;

PRINT 'Da them cot thanh cong';
