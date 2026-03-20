using Microsoft.EntityFrameworkCore;
using NguyenVoAnhKiet_2122110562.Models;

namespace NguyenVoAnhKiet_2122110562.Data
{
    public class AppDbContext : DbContext
    {
        // Constructor
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        // DbSet (các bảng)
        public DbSet<Table> Tables { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderDetail> OrderDetails { get; set; }
        public DbSet<Bill> Bills { get; set; }
        public DbSet<User> Users { get; set; }

        // 🔥 Cấu hình thêm
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Fix decimal bị warning
            modelBuilder.Entity<Product>()
                .Property(p => p.Price)
                .HasPrecision(10, 2);

            modelBuilder.Entity<Bill>()
                .Property(b => b.TotalAmount)
                .HasPrecision(10, 2);

            modelBuilder.Entity<Bill>()
                .Property(b => b.Discount)
                .HasPrecision(10, 2);

            // Fix chắc chắn primary key cho OrderDetail (phòng lỗi)
            modelBuilder.Entity<OrderDetail>()
                .HasKey(o => o.DetailId);
        }
    }
}