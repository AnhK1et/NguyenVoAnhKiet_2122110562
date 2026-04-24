using System.ComponentModel.DataAnnotations;

namespace NguyenVoAnhKiet_2122110562.Models
{
    public class OrderDetail
    {
        [Key]
        public int DetailId { get; set; }

        public int OrderId { get; set; }
        public Order? Order { get; set; }

        public int ProductId { get; set; }
        public Product? Product { get; set; }

        public int Quantity { get; set; }
        
        // Trạng thái món: Đang chờ, Đã làm, Đã hủy
        public string Status { get; set; } = "Đang chờ";
        
        // Ghi chú hủy
        public string? CancelNote { get; set; }
    }
}