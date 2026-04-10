using Microsoft.EntityFrameworkCore;
using NguyenVoAnhKiet_2122110562.Models;

namespace NguyenVoAnhKiet_2122110562.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

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

            // --- FIX LỖI CẢNH BÁO VÀNG TẠI ĐÂY ---
            modelBuilder.Entity<Product>().Property(p => p.Price).HasPrecision(18, 2);
            modelBuilder.Entity<Bill>().Property(b => b.TotalAmount).HasPrecision(18, 2);
            modelBuilder.Entity<Bill>().Property(b => b.Discount).HasPrecision(18, 2); // Thêm dòng này để hết báo vàng

            modelBuilder.Entity<User>().HasIndex(u => u.Username).IsUnique();
            modelBuilder.Entity<OrderDetail>().HasKey(od => od.DetailId);

            // --- SEED DATA NOM COFFEE ---
            modelBuilder.Entity<Category>().HasData(new Category { CategoryId = 1, Name = "Coffee" });

            modelBuilder.Entity<Product>().HasData(
                new Product { ProductId = 1, Name = "Black Coffee", Price = 20000, CategoryId = 1 },
                new Product { ProductId = 2, Name = "Rich Milk Coffee", Price = 25000, CategoryId = 1 },
                new Product { ProductId = 3, Name = "Espresso", Price = 27000, CategoryId = 1 },
                new Product { ProductId = 4, Name = "Americano", Price = 27000, CategoryId = 1 },
                new Product { ProductId = 5, Name = "Bạc Xỉu", Price = 29000, CategoryId = 1 },
                new Product { ProductId = 6, Name = "Mocha", Price = 38000, CategoryId = 1 },
                new Product { ProductId = 7, Name = "Cappuccino", Price = 38000, CategoryId = 1 },
                new Product { ProductId = 8, Name = "Latte", Price = 38000, CategoryId = 1 }
            );

            modelBuilder.Entity<Table>().HasData(
                new Table { TableId = 1, Name = "Bàn 01", Status = "Available" },
                new Table { TableId = 2, Name = "Bàn 02", Status = "Available" }
            );

            modelBuilder.Entity<User>().HasData(
                new User { UserId = 1, Username = "admin", Password = "123", Role = "Admin" }
            );
        }
    }
}