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
            
            var result = bills.Select(b => new {
                b.BillId,
                b.OrderId,
                OrderStatus = b.Order != null ? b.Order.Status : null,
                TableName = b.Order?.Table != null ? b.Order.Table.Name : null,
                b.Status,
                b.TotalAmount,
                b.Discount,
                b.PaymentMethod,
                b.AmountPaid,
                b.ChangeAmount,
                b.PaymentDate,
                OrderDetails = b.Order?.OrderDetails?.Select(d => new {
                    d.DetailId,
                    d.ProductId,
                    ProductName = d.Product != null ? d.Product.Name : null,
                    ProductPrice = d.Product != null ? d.Product.Price : 0,
                    d.Quantity,
                    d.Status
                }).ToList()
            }).ToList();
            
            return Ok(result);
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
            
            var result = new {
                bill.BillId,
                bill.OrderId,
                OrderStatus = bill.Order != null ? bill.Order.Status : null,
                TableName = bill.Order?.Table != null ? bill.Order.Table.Name : null,
                bill.Status,
                bill.TotalAmount,
                bill.Discount,
                bill.PaymentMethod,
                bill.AmountPaid,
                bill.ChangeAmount,
                bill.PaymentDate,
                OrderDetails = bill.Order?.OrderDetails?.Select(d => new {
                    d.DetailId,
                    d.ProductId,
                    ProductName = d.Product != null ? d.Product.Name : null,
                    ProductPrice = d.Product != null ? d.Product.Price : 0,
                    d.Quantity,
                    d.Status
                }).ToList()
            };
            
            return Ok(result);
        }

        // POST: api/bill - Tạo hóa đơn mới
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateBillRequest request)
        {
            if (request.OrderId <= 0)
                return BadRequest("OrderId không hợp lệ");

            // Kiểm tra đã có bill chưa
            var existingBill = await _context.Bills
                .FirstOrDefaultAsync(b => b.OrderId == request.OrderId);

            if (existingBill != null)
            {
                return Ok(new
                {
                    billId = existingBill.BillId,
                    orderId = existingBill.OrderId,
                    totalAmount = existingBill.TotalAmount,
                    discount = existingBill.Discount,
                    finalAmount = existingBill.TotalAmount - existingBill.Discount,
                    status = existingBill.Status,
                    message = "Hóa đơn đã tồn tại"
                });
            }

            var order = await _context.Orders
                .Include(o => o.OrderDetails)
                    .ThenInclude(od => od.Product)
                .Include(o => o.Table)
                .FirstOrDefaultAsync(o => o.OrderId == request.OrderId);

            if (order == null)
                return NotFound("Order không tồn tại");

            // Kiểm tra order đang phục vụ
            if (order.Status == "Đã thanh toán")
                return BadRequest("Đơn hàng đã được thanh toán trước đó");

            // Kiểm tra có món chưa
            if (order.OrderDetails == null || !order.OrderDetails.Any())
                return BadRequest("Đơn hàng chưa có món. Vui lòng thêm món trước khi lập hóa đơn.");

            // Tính tổng tiền
            var totalAmount = order.OrderDetails
                .Sum(od => od.Quantity * (od.Product?.Price ?? 0));

            var bill = new Bill
            {
                OrderId = request.OrderId,
                TotalAmount = totalAmount,
                Discount = request.Discount,
                Status = "Đã thanh toán",
                PaymentMethod = request.Discount > 0 ? "Tiền mặt" : "Tiền mặt",
                AmountPaid = totalAmount - request.Discount,
                PaymentDate = DateTime.Now
            };

            // Cập nhật Order thành Đã thanh toán
            order.Status = "Đã thanh toán";
            
            // Cập nhật bàn về Trống
            if (order.Table != null)
            {
                order.Table.Status = "Trống";
            }

            _context.Bills.Add(bill);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                billId = bill.BillId,
                orderId = bill.OrderId,
                totalAmount = bill.TotalAmount,
                discount = bill.Discount,
                finalAmount = bill.TotalAmount - bill.Discount,
                status = bill.Status,
                amountPaid = bill.AmountPaid,
                tableName = order.Table?.Name,
                message = "Lập hóa đơn và thanh toán thành công!"
            });
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
            
            var result = new {
                bill.BillId,
                bill.OrderId,
                OrderStatus = bill.Order != null ? bill.Order.Status : null,
                TableName = bill.Order?.Table != null ? bill.Order.Table.Name : null,
                bill.Status,
                bill.TotalAmount,
                bill.Discount,
                bill.PaymentMethod,
                bill.AmountPaid,
                bill.ChangeAmount,
                bill.PaymentDate,
                OrderDetails = bill.Order?.OrderDetails?.Select(d => new {
                    d.DetailId,
                    d.ProductId,
                    ProductName = d.Product != null ? d.Product.Name : null,
                    ProductPrice = d.Product != null ? d.Product.Price : 0,
                    d.Quantity,
                    d.Status
                }).ToList()
            };
            
            return Ok(result);
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

    public class CreateBillRequest
    {
        public int OrderId { get; set; }
        public decimal Discount { get; set; } = 0;
    }
}
