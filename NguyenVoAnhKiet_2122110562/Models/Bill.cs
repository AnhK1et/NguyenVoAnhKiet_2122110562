using System.ComponentModel.DataAnnotations;

namespace NguyenVoAnhKiet_2122110562.Models
{
    public class Bill
    {
        [Key]
        public int BillId { get; set; }

        public int OrderId { get; set; }
        public Order? Order { get; set; }

        public decimal TotalAmount { get; set; }
        public decimal Discount { get; set; }
        public DateTime PaymentDate { get; set; } = DateTime.Now;
    }
}