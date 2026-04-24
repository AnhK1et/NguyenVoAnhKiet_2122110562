using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NguyenVoAnhKiet_2122110562.Data;
using NguyenVoAnhKiet_2122110562.Models;

namespace NguyenVoAnhKiet_2122110562.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BillController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BillController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/bill
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var bills = await _context.Bills
                .Include(b => b.Order)
                    .ThenInclude(o => o!.Table)
                .Include(b => b.Order)
                    .ThenInclude(o => o!.OrderDetails)
                        .ThenInclude(od => od.Product)
                .ToListAsync();
            return Ok(bills);
        }

        // GET: api/bill/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var bill = await _context.Bills
                .Include(b => b.Order)
                    .ThenInclude(o => o!.Table)
                .Include(b => b.Order)
                    .ThenInclude(o => o!.OrderDetails)
                        .ThenInclude(od => od.Product)
                .FirstOrDefaultAsync(b => b.BillId == id);

            if (bill == null) return NotFound();
            return Ok(bill);
        }

        // GET: api/bill/order/5
        [HttpGet("order/{orderId}")]
        public async Task<IActionResult> GetByOrderId(int orderId)
        {
            var bill = await _context.Bills
                .Include(b => b.Order)
                    .ThenInclude(o => o!.Table)
                .Include(b => b.Order)
                    .ThenInclude(o => o!.OrderDetails)
                        .ThenInclude(od => od.Product)
                .FirstOrDefaultAsync(b => b.OrderId == orderId);

            if (bill == null) return NotFound();
            return Ok(bill);
        }

        // =============================================
        // ÁP DỤNG GIẢM GIÁ
        // =============================================
        [HttpPut("{billId}/discount")]
        public async Task<IActionResult> ApplyDiscount(int billId, [FromBody] ApplyDiscountRequest request)
        {
            var bill = await _context.Bills
                .Include(b => b.Order)
                .FirstOrDefaultAsync(b => b.BillId == billId);

            if (bill == null)
                return NotFound("Hóa đơn không tồn tại");

            if (bill.Status == "Đã thanh toán")
                return BadRequest("Hóa đơn đã thanh toán, không thể sửa");

            if (request.Discount < 0)
                return BadRequest("Giảm giá không được âm");

            bill.Discount = request.Discount;
            await _context.SaveChangesAsync();

            var finalAmount = bill.TotalAmount - bill.Discount;

            return Ok(new {
                billId = bill.BillId,
                totalAmount = bill.TotalAmount,
                discount = bill.Discount,
                finalAmount = finalAmount
            });
        }

        // =============================================
        // THANH TOÁN
        // =============================================
        [HttpPost("{billId}/pay")]
        public async Task<IActionResult> Pay(int billId, [FromBody] PayRequest request)
        {
            var bill = await _context.Bills
                .Include(b => b.Order)
                    .ThenInclude(o => o!.Table)
                .Include(b => b.Order)
                    .ThenInclude(o => o!.OrderDetails)
                .FirstOrDefaultAsync(b => b.BillId == billId);

            if (bill == null)
                return NotFound("Hóa đơn không tồn tại");

            if (bill.Status == "Đã thanh toán")
                return BadRequest("Hóa đơn đã được thanh toán trước đó");

            var finalAmount = bill.TotalAmount - bill.Discount;

            // Kiểm tra số tiền khách trả
            if (request.AmountPaid < finalAmount)
                return BadRequest($"Số tiền khách trả ({request.AmountPaid:N0}đ) không đủ. Cần trả: {finalAmount:N0}đ");

            // Cập nhật thông tin thanh toán
            bill.PaymentMethod = request.PaymentMethod;
            bill.AmountPaid = request.AmountPaid;
            bill.ChangeAmount = request.AmountPaid - finalAmount;
            bill.PaymentDate = DateTime.Now;
            bill.Status = "Đã thanh toán";

            // Cập nhật trạng thái Order
            if (bill.Order != null)
            {
                bill.Order.Status = "Đã thanh toán";
                
                // Cập nhật trạng thái bàn về Trống
                if (bill.Order.Table != null)
                {
                    bill.Order.Table.Status = "Trống";
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new {
                message = "Thanh toán thành công",
                billId = bill.BillId,
                orderId = bill.OrderId,
                tableName = bill.Order?.Table?.Name,
                totalAmount = bill.TotalAmount,
                discount = bill.Discount,
                finalAmount = finalAmount,
                amountPaid = bill.AmountPaid,
                changeAmount = bill.ChangeAmount,
                paymentMethod = bill.PaymentMethod,
                paymentDate = bill.PaymentDate
            });
        }

        // =============================================
        // THANH TOÁN MỘT PHẦN
        // =============================================
        [HttpPost("{billId}/pay-partial")]
        public async Task<IActionResult> PayPartial(int billId, [FromBody] PayPartialRequest request)
        {
            var bill = await _context.Bills
                .Include(b => b.Order)
                .FirstOrDefaultAsync(b => b.BillId == billId);

            if (bill == null)
                return NotFound("Hóa đơn không tồn tại");

            if (bill.Status == "Đã thanh toán")
                return BadRequest("Hóa đơn đã thanh toán đầy đủ");

            var finalAmount = bill.TotalAmount - bill.Discount;

            // Kiểm tra số tiền
            if (request.AmountPaid <= 0)
                return BadRequest("Số tiền trả phải lớn hơn 0");

            if (request.AmountPaid > finalAmount)
                return BadRequest($"Số tiền trả vượt quá số tiền cần thanh toán ({finalAmount:N0}đ)");

            bill.AmountPaid += request.AmountPaid;
            bill.PaymentMethod = request.PaymentMethod;

            if (bill.AmountPaid >= finalAmount)
            {
                bill.Status = "Đã thanh toán";
                bill.ChangeAmount = bill.AmountPaid - finalAmount;
                
                if (bill.Order != null)
                {
                    bill.Order.Status = "Đã thanh toán";
                    if (bill.Order.Table != null)
                        bill.Order.Table.Status = "Trống";
                }
            }
            else
            {
                bill.Status = "Thanh toán một phần";
            }

            await _context.SaveChangesAsync();

            var remainingAmount = finalAmount - bill.AmountPaid;

            return Ok(new {
                message = bill.Status == "Đã thanh toán" ? "Thanh toán hoàn tất" : "Thanh toán một phần thành công",
                billId = bill.BillId,
                totalAmount = bill.TotalAmount,
                discount = bill.Discount,
                finalAmount = finalAmount,
                amountPaid = bill.AmountPaid,
                remainingAmount = remainingAmount,
                status = bill.Status
            });
        }

        // DELETE: api/bill/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var bill = await _context.Bills.FindAsync(id);
            if (bill == null) return NotFound();

            _context.Bills.Remove(bill);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }

    public class ApplyDiscountRequest
    {
        public decimal Discount { get; set; }
    }

    public class PayRequest
    {
        public decimal AmountPaid { get; set; }
        public string PaymentMethod { get; set; } = "Tiền mặt";
    }

    public class PayPartialRequest
    {
        public decimal AmountPaid { get; set; }
        public string PaymentMethod { get; set; } = "Tiền mặt";
    }
}
