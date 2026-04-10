using System.ComponentModel.DataAnnotations;

namespace NguyenVoAnhKiet_2122110562.Models
{
    public class Table
    {
        [Key]
        public int TableId { get; set; }

        // Đổi TableName thành Name để khớp với code Seed Data và đồng bộ với các class khác (như Product, Category)
        public string Name { get; set; } = string.Empty;

        public string Status { get; set; } = "Trống";

        // Navigation property
        public ICollection<Order> Orders { get; set; } = new List<Order>();
    }
}