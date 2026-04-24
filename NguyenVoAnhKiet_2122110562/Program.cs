using Microsoft.EntityFrameworkCore;
using NguyenVoAnhKiet_2122110562.Data;
using NguyenVoAnhKiet_2122110562.Models;

var builder = WebApplication.CreateBuilder(args);

// 🔌 Đã đổi từ SQL Server sang PostgreSQL (Dùng cho Supabase)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

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
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "NomCoffee API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new()
    {
        Description = "JWT Authorization header. Example: 'Bearer {token}'",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new()
    {
        {
            new() { Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// 🔥 Luôn bật Swagger để kiểm tra API trên Render
app.UseSwagger();
app.UseSwaggerUI();

// ✅ 3. Kích hoạt CORS (Quan trọng: Phải đặt TRƯỚC MapControllers)
app.UseCors("AllowAll");

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

// 🔥 Seed default admin user (sau này xóa endpoint này)
using (var scope = app.Services.CreateScope())
{
  var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
  db.Database.EnsureCreated();
  if (!db.Users.Any())
  {
    db.Users.AddRange(
      new User { Username = "admin", Password = "$2a$11$rBVjvgZPQl5vZJVrPZvEPOZ9qHqvL.P5E6E3W1mLgH8vJxJ3h3LPC", Role = "Admin" },
      new User { Username = "nhanvien1", Password = "$2a$11$rBVjvgZPQl5vZJVrPZvEPOZ9qHqvL.P5E6E3W1mLgH8vJxJ3h3LPC", Role = "Staff" }
    );
    db.SaveChanges();
  }
}

app.Run();