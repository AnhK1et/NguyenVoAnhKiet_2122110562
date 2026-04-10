# Giai đoạn Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source

# Copy file dự án từ thư mục con và restore
COPY NguyenVoAnhKiet_2122110562/*.csproj ./NguyenVoAnhKiet_2122110562/
RUN dotnet restore ./NguyenVoAnhKiet_2122110562/NguyenVoAnhKiet_2122110562.csproj

# Copy toàn bộ và build
COPY . .
WORKDIR /source/NguyenVoAnhKiet_2122110562
RUN dotnet publish -c Release -o /app

# Giai đoạn Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "NguyenVoAnhKiet_2122110562.dll"]