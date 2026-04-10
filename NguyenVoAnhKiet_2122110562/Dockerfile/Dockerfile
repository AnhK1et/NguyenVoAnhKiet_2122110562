# Giai đoạn Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source

# Copy file dự án và khôi phục thư viện
COPY *.csproj .
RUN dotnet restore

# Copy toàn bộ code còn lại và xuất bản (Publish)
COPY . .
RUN dotnet publish -c Release -o /app

# Giai đoạn Chạy (Runtime)
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .

# Lệnh khởi chạy chính xác với tên file của bạn
ENTRYPOINT ["dotnet", "NguyenVoAnhKiet_2122110562.dll"]