using System.ComponentModel.DataAnnotations;

namespace NguyenVoAnhKiet_2122110562.Models
{
    public class Table
    {
        [Key]
        public int TableId { get; set; }
        public string TableName { get; set; } = string.Empty;
        public string Status { get; set; } = "Trống";

        public ICollection<Order> Orders { get; set; } = new List<Order>();
    }
}