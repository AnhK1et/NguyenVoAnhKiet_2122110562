using Microsoft.EntityFrameworkCore;
using NguyenVoAnhKiet_2122110562.Data;

var builder = WebApplication.CreateBuilder(args);

// 🔌 Đã đổi từ SQL Server sang PostgreSQL (Dùng cho Supabase)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ✅ 1. Cấu hình CORS: Cho phép trang quản lý PHP gọi dữ liệu từ mọi nơi
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// ✅ 2. Sửa lỗi hiển thị dữ liệu (Xử lý vòng lặp Object Cycle)
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// 🔥 Luôn bật Swagger để kiểm tra API trên Render
app.UseSwagger();
app.UseSwaggerUI();

// ✅ 3. Kích hoạt CORS (Quan trọng: Phải đặt TRƯỚC MapControllers)
app.UseCors("AllowAll");

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();