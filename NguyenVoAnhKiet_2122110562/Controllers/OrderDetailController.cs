using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NguyenVoAnhKiet_2122110562.Data;
using NguyenVoAnhKiet_2122110562.Models;

namespace NguyenVoAnhKiet_2122110562.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrderDetailController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OrderDetailController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/orderdetail
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var details = await _context.OrderDetails
                .Include(x => x.Product)
                .Include(x => x.Order)
                .ToListAsync();
            return Ok(details);
        }

        // GET: api/orderdetail/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var detail = await _context.OrderDetails
                .Include(x => x.Product)
                .Include(x => x.Order)
                .FirstOrDefaultAsync(x => x.DetailId == id);

            if (detail == null) return NotFound();
            return Ok(detail);
        }

        // GET: api/orderdetail/order/5
        [HttpGet("order/{orderId}")]
        public async Task<IActionResult> GetByOrder(int orderId)
        {
            var data = await _context.OrderDetails
                .Where(x => x.OrderId == orderId)
                .Include(x => x.Product)
                .ToListAsync();

            return Ok(data);
        }

        // =============================================
        // THÊM MÓN
        // =============================================
        [HttpPost]
        public async Task<IActionResult> Create(OrderDetail detail)
        {
            // Validate Order tồn tại và đang phục vụ
            var order = await _context.Orders.FindAsync(detail.OrderId);
            if (order == null)
                return NotFound("Đơn hàng không tồn tại");

            if (order.Status != "Đang phục vụ")
                return BadRequest($"Đơn hàng đang có trạng thái: {order.Status}. Không thể thêm món.");

            // Validate Product tồn tại
            var product = await _context.Products.FindAsync(detail.ProductId);
            if (product == null)
                return NotFound("Sản phẩm không tồn tại");

            detail.Status = "Đang chờ";
            
            _context.OrderDetails.Add(detail);
            await _context.SaveChangesAsync();

            // Cập nhật Bill
            var bill = await _context.Bills.FirstOrDefaultAsync(b => b.OrderId == order.OrderId);
            if (bill != null)
            {
                bill.TotalAmount += product.Price * detail.Quantity;
                await _context.SaveChangesAsync();
            }

            return Ok(new {
                detailId = detail.DetailId,
                productName = product.Name,
                quantity = detail.Quantity,
                price = product.Price,
                subtotal = product.Price * detail.Quantity
            });
        }

        // =============================================
        // CẬP NHẬT TRẠNG THÁI MÓN (Đang chờ -> Đã làm)
        // =============================================
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusRequest request)
        {
            var detail = await _context.OrderDetails.FindAsync(id);
            if (detail == null)
                return NotFound("Không tìm thấy món");

            detail.Status = request.Status;
            await _context.SaveChangesAsync();

            return Ok(new { detailId = detail.DetailId, status = detail.Status });
        }

        // =============================================
        // HỦY MÓN
        // =============================================
        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> Cancel(int id, [FromBody] CancelDetailRequest request)
        {
            var detail = await _context.OrderDetails
                .Include(d => d.Product)
                .Include(d => d.Order)
                    .ThenInclude(o => o!.Bill)
                .FirstOrDefaultAsync(d => d.DetailId == id);

            if (detail == null)
                return NotFound("Không tìm thấy món");

            if (detail.Order?.Status != "Đang phục vụ")
                return BadRequest("Đơn hàng không còn cho phép hủy món");

            // Cập nhật tổng tiền
            if (detail.Order?.Bill != null)
            {
                detail.Order.Bill.TotalAmount -= (detail.Product?.Price ?? 0) * detail.Quantity;
            }

            detail.Status = "Đã hủy";
            detail.CancelNote = request.Reason;

            await _context.SaveChangesAsync();

            return Ok(new { 
                message = "Đã hủy món",
                reason = request.Reason,
                refundAmount = (detail.Product?.Price ?? 0) * detail.Quantity,
                newTotal = detail.Order?.Bill?.TotalAmount
            });
        }

        // DELETE: api/orderdetail/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var detail = await _context.OrderDetails
                .Include(d => d.Product)
                .Include(d => d.Order)
                    .ThenInclude(o => o!.Bill)
                .FirstOrDefaultAsync(d => d.DetailId == id);

            if (detail == null) return NotFound();

            // Cập nhật tổng tiền
            if (detail.Order?.Bill != null)
            {
                detail.Order.Bill.TotalAmount -= (detail.Product?.Price ?? 0) * detail.Quantity;
            }

            _context.OrderDetails.Remove(detail);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }

    public class UpdateStatusRequest
    {
        public string Status { get; set; } = "Đã làm";
    }

    public class CancelDetailRequest
    {
        public string Reason { get; set; } = "";
    }
}
