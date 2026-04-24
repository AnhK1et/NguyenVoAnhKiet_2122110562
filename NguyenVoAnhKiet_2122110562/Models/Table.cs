using System.ComponentModel.DataAnnotations;

namespace NguyenVoAnhKiet_2122110562.Models
{
    public class Table
    {
        [Key]
        public int TableId { get; set; }

        public string Name { get; set; } = string.Empty;

        // Trạng thái: Trống, Đang phục vụ, Chờ thanh toán, Đã đặt trước, Bảo trì
        public string Status { get; set; } = "Trống";
        
        // Bàn có đang bị khóa không (đang có người thao tác)
        public bool IsLocked { get; set; } = false;

        // Navigation property
        public ICollection<Order> Orders { get; set; } = new List<Order>();
    }
}