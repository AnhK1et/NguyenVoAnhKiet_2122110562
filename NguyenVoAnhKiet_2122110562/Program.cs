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

// 🔥 Seed default data (sau này xóa endpoint này)
using (var scope = app.Services.CreateScope())
{
  var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
  db.Database.EnsureCreated();
  
  if (!db.Users.Any())
  {
    db.Users.AddRange(
      new User { Username = "admin", Password = BCrypt.Net.BCrypt.HashPassword("123"), Role = "Admin" },
      new User { Username = "nhanvien1", Password = BCrypt.Net.BCrypt.HashPassword("123"), Role = "Staff" }
    );
  }
  
  if (!db.Categories.Any())
  {
    db.Categories.AddRange(
      new Category { Name = "Cà phê" },
      new Category { Name = "Trà" },
      new Category { Name = "Nước ép" },
      new Category { Name = "Sinh tố" },
      new Category { Name = "Bánh" }
    );
    db.SaveChanges();
  }
  
  if (!db.Products.Any())
  {
    var catCoffee = db.Categories.First(c => c.Name == "Cà phê");
    var catTea = db.Categories.First(c => c.Name == "Trà");
    var catJuice = db.Categories.First(c => c.Name == "Nước ép");
    var catSmoothie = db.Categories.First(c => c.Name == "Sinh tố");
    var catCake = db.Categories.First(c => c.Name == "Bánh");
    
    db.Products.AddRange(
      new Product { Name = "Cà phê đen", Price = 25000, CategoryId = catCoffee.CategoryId },
      new Product { Name = "Cà phê sữa", Price = 30000, CategoryId = catCoffee.CategoryId },
      new Product { Name = "Bạc xỉu", Price = 35000, CategoryId = catCoffee.CategoryId },
      new Product { Name = "Cappuccino", Price = 45000, CategoryId = catCoffee.CategoryId },
      new Product { Name = "Latte", Price = 50000, CategoryId = catCoffee.CategoryId },
      new Product { Name = "Trà đá", Price = 15000, CategoryId = catTea.CategoryId },
      new Product { Name = "Trà sen", Price = 25000, CategoryId = catTea.CategoryId },
      new Product { Name = "Trà vải", Price = 30000, CategoryId = catTea.CategoryId },
      new Product { Name = "Nước ép cam", Price = 35000, CategoryId = catJuice.CategoryId },
      new Product { Name = "Nước ép táo", Price = 35000, CategoryId = catJuice.CategoryId },
      new Product { Name = "Sinh tố bơ", Price = 40000, CategoryId = catSmoothie.CategoryId },
      new Product { Name = "Sinh tố dâu", Price = 45000, CategoryId = catSmoothie.CategoryId },
      new Product { Name = "Bánh mì", Price = 20000, CategoryId = catCake.CategoryId },
      new Product { Name = "Bánh croissant", Price = 30000, CategoryId = catCake.CategoryId }
    );
  }
  
  if (!db.Tables.Any())
  {
    for (int i = 1; i <= 10; i++)
    {
      db.Tables.Add(new Table { Name = $"Bàn {i}", Status = "Trống", IsLocked = false });
    }
  }
  
  db.SaveChanges();
}

app.Run();