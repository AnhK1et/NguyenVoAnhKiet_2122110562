using System.ComponentModel.DataAnnotations;

namespace NguyenVoAnhKiet_2122110562.Models
{
    public class Order
    {
        [Key]
        public int OrderId { get; set; }

        public int TableId { get; set; }
        public Table? Table { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;
        
        // Trạng thái: Đang phục vụ, Chờ thanh toán, Đã thanh toán, Đã hủy
        public string Status { get; set; } = "Đang phục vụ";
        
        // Ghi chú hủy (nếu có)
        public string? CancelNote { get; set; }

        public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
        public Bill? Bill { get; set; }
    }
}