using System.ComponentModel.DataAnnotations;

namespace NguyenVoAnhKiet_2122110562.Models
{
    public class Bill
    {
        [Key]
        public int BillId { get; set; }

        [Required]
        public int OrderId { get; set; }

        [Required]
        public decimal TotalAmount { get; set; }

        public decimal Discount { get; set; }

        [Required]
        public DateTime PaymentDate { get; set; }
    }
}