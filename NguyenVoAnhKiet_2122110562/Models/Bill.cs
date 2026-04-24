using System.ComponentModel.DataAnnotations;

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
        public decimal AmountPaid { get; set; }
        
        // Tiền thối lại (nếu trả dư)
        public decimal ChangeAmount { get; set; }
        
        public DateTime PaymentDate { get; set; } = DateTime.Now;
    }
}