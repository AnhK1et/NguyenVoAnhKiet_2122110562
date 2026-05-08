using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NguyenVoAnhKiet_2122110562.Models
{
    public class Bill
    {
        [Key]
        public int BillId { get; set; }

        public int OrderId { get; set; }
        public Order? Order { get; set; }

        // Trạng thái: Đang mở, Chờ thanh toán, Đã thanh toán, Đã hủy, Thanh toán một phần
        public string Status { get; set; } = "Đang mở";
        
        public decimal TotalAmount { get; set; }
        public decimal Discount { get; set; }
        
        // Phương thức thanh toán: Tiền mặt, Chuyển khoản, Ví điện tử
        public string PaymentMethod { get; set; } = "";
        
        // Tiền khách trả
        [Column(TypeName = "decimal(18,2)")]
        public decimal AmountPaid { get; set; }
        
        // Tiền thối lại (nếu trả dư)
        [Column(TypeName = "decimal(18,2)")]
        public decimal ChangeAmount { get; set; }
        
        public DateTime PaymentDate { get; set; } = DateTime.Now;
    }
}