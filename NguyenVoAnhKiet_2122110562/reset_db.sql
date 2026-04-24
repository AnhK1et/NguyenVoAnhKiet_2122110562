-- Drop và tạo lại database để update schema
USE master;
GO
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'NomCoffeeDB')
BEGIN
    ALTER DATABASE NomCoffeeDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE NomCoffeeDB;
END
CREATE DATABASE NomCoffeeDB;
GO
