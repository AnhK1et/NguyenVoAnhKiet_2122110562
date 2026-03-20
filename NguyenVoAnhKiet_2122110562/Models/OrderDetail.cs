using System.ComponentModel.DataAnnotations;

namespace NguyenVoAnhKiet_2122110562.Models
{
    public class OrderDetail
    {
        [Key]
        public int DetailId { get; set; } // ✅ FIX LỖI Ở ĐÂY

        [Required]
        public int OrderId { get; set; }

        [Required]
        public int ProductId { get; set; }

        [Required]
        public int Quantity { get; set; }
    }
}