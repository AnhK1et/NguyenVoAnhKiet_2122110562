using Microsoft.EntityFrameworkCore;
using NguyenVoAnhKiet_2122110562.Models;

namespace NguyenVoAnhKiet_2122110562.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
            // ✅ QUAN TRỌNG: Tự động tạo bảng trên Supabase khi Web chạy trên Render
            // Bạn không cần chạy lệnh Update-Database ở máy cá nhân nữa.
            this.Database.EnsureCreated();
        }

        public DbSet<Table> Tables { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderDetail> OrderDetails { get; set; }
        public DbSet<Bill> Bills { get; set; }
        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // --- FIX LỖI CẢNH BÁO VÀNG ---
            modelBuilder.Entity<Product>().Property(p => p.Price).HasPrecision(18, 2);
            modelBuilder.Entity<Bill>().Property(b => b.TotalAmount).HasPrecision(18, 2);
            modelBuilder.Entity<Bill>().Property(b => b.Discount).HasPrecision(18, 2);

            modelBuilder.Entity<User>().HasIndex(u => u.Username).IsUnique();
            modelBuilder.Entity<OrderDetail>().HasKey(od => od.DetailId);

            // --- SEED DATA NOM COFFEE ---
            // Lưu ý: Chỉ nên để Seed Data ở đây nếu Database trống
            modelBuilder.Entity<Category>().HasData(
                new Category { CategoryId = 1, Name = "Cà phê" },
                new Category { CategoryId = 2, Name = "Trà" },
                new Category { CategoryId = 3, Name = "Nước ép" },
                new Category { CategoryId = 4, Name = "Sinh tố" },
                new Category { CategoryId = 5, Name = "Đồ ăn" }
            );

            modelBuilder.Entity<Product>().HasData(
                // Cà phê (Cat 1)
                new Product { ProductId = 1,  Name = "Cà phê đen",       Price = 22000, CategoryId = 1 },
                new Product { ProductId = 2,  Name = "Cà phê sữa",       Price = 27000, CategoryId = 1 },
                new Product { ProductId = 3,  Name = "Espresso",          Price = 30000, CategoryId = 1 },
                new Product { ProductId = 4,  Name = "Americano",         Price = 30000, CategoryId = 1 },
                new Product { ProductId = 5,  Name = "Bạc xỉu",          Price = 32000, CategoryId = 1 },
                new Product { ProductId = 6,  Name = "Mocha",            Price = 40000, CategoryId = 1 },
                new Product { ProductId = 7,  Name = "Cappuccino",       Price = 40000, CategoryId = 1 },
                new Product { ProductId = 8,  Name = "Latte",            Price = 40000, CategoryId = 1 },
                new Product { ProductId = 9,  Name = "Caramel Macchiato", Price = 45000, CategoryId = 1 },
                new Product { ProductId = 10, Name = "Cold Brew",        Price = 35000, CategoryId = 1 },
                // Trà (Cat 2)
                new Product { ProductId = 11, Name = "Trà đá",           Price = 12000, CategoryId = 2 },
                new Product { ProductId = 12, Name = "Trà sữa",         Price = 28000, CategoryId = 2 },
                new Product { ProductId = 13, Name = "Trà vải",         Price = 30000, CategoryId = 2 },
                new Product { ProductId = 14, Name = "Trà đào",         Price = 30000, CategoryId = 2 },
                new Product { ProductId = 15, Name = "Trà chanh",       Price = 25000, CategoryId = 2 },
                // Nước ép (Cat 3)
                new Product { ProductId = 16, Name = "Cam ép",           Price = 30000, CategoryId = 3 },
                new Product { ProductId = 17, Name = "Nước ép cà rốt",  Price = 28000, CategoryId = 3 },
                new Product { ProductId = 18, Name = "Nước ép táo",     Price = 30000, CategoryId = 3 },
                new Product { ProductId = 19, Name = "Sinh tố bơ",      Price = 35000, CategoryId = 3 },
                // Sinh tố (Cat 4)
                new Product { ProductId = 20, Name = "Sinh tố dâu",      Price = 35000, CategoryId = 4 },
                new Product { ProductId = 21, Name = "Sinh tố xoài",    Price = 35000, CategoryId = 4 },
                new Product { ProductId = 22, Name = "Sinh tố sầu riêng", Price = 45000, CategoryId = 4 },
                // Đồ ăn (Cat 5)
                new Product { ProductId = 23, Name = "Bánh mì pate",     Price = 20000, CategoryId = 5 },
                new Product { ProductId = 24, Name = "Bánh flan",       Price = 15000, CategoryId = 5 },
                new Product { ProductId = 25, Name = "Khoai tây chiên", Price = 25000, CategoryId = 5 },
                new Product { ProductId = 26, Name = "Gà rán",          Price = 40000, CategoryId = 5 },
                new Product { ProductId = 27, Name = "Sandwich",         Price = 30000, CategoryId = 5 }
            );

            modelBuilder.Entity<Table>().HasData(
                new Table { TableId = 1,  Name = "Bàn 01", Status = "Trống" },
                new Table { TableId = 2,  Name = "Bàn 02", Status = "Trống" },
                new Table { TableId = 3,  Name = "Bàn 03", Status = "Trống" },
                new Table { TableId = 4,  Name = "Bàn 04", Status = "Trống" },
                new Table { TableId = 5,  Name = "Bàn 05", Status = "Trống" },
                new Table { TableId = 6,  Name = "Bàn 06", Status = "Trống" },
                new Table { TableId = 7,  Name = "Bàn 07", Status = "Trống" },
                new Table { TableId = 8,  Name = "Bàn 08", Status = "Trống" },
                new Table { TableId = 9,  Name = "Bàn 09", Status = "Trống" },
                new Table { TableId = 10, Name = "Bàn 10", Status = "Trống" },
                new Table { TableId = 11, Name = "Bàn VIP 1", Status = "Trống" },
                new Table { TableId = 12, Name = "Bàn VIP 2", Status = "Trống" }
            );

            modelBuilder.Entity<User>().HasData(
                new User { UserId = 1, Username = "admin", Password = "123", Role = "Admin" }
            );
        }
    }
}