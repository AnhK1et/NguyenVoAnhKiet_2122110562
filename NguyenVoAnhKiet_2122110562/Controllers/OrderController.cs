using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NguyenVoAnhKiet_2122110562.Data;
using NguyenVoAnhKiet_2122110562.Models;

namespace NguyenVoAnhKiet_2122110562.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrderController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OrderController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/order
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var orders = await _context.Orders
                .Include(o => o.Table)
                .Include(o => o.OrderDetails)
                    .ThenInclude(od => od.Product)
                .Include(o => o.Bill)
                .ToListAsync();
            
            return Ok(orders);
        }

        // GET: api/order/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var order = await _context.Orders
                .Include(o => o.Table)
                .Include(o => o.OrderDetails)
                    .ThenInclude(od => od.Product)
                .Include(o => o.Bill)
                .FirstOrDefaultAsync(o => o.OrderId == id);

            if (order == null) return NotFound();
            return Ok(order);
        }

        // =============================================
        // TẠO ORDER MỚI (Khi khách vào quán)
        // =============================================
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateOrderRequest request)
        {
            // Kiểm tra bàn có tồn tại không
            var table = await _context.Tables.FindAsync(request.TableId);
            if (table == null)
                return NotFound("Bàn không tồn tại");

            // Kiểm tra bàn đã có đơn đang phục vụ chưa
            var existingOrder = await _context.Orders
                .Where(o => o.TableId == request.TableId && o.Status == "Đang phục vụ")
                .FirstOrDefaultAsync();

            if (existingOrder != null)
                return BadRequest(new { message = "Bàn này đã có đơn đang phục vụ", orderId = existingOrder.OrderId });

            // Kiểm tra bàn có đang trống không
            if (table.Status != "Trống")
                return BadRequest($"Bàn đang có trạng thái: {table.Status}. Không thể tạo đơn mới.");

            // Tạo đơn mới
            var order = new Order
            {
                TableId = request.TableId,
                CreatedAt = DateTime.Now,
                Status = "Đang phục vụ"
            };

            _context.Orders.Add(order);
            
            // Cập nhật trạng thái bàn
            table.Status = "Đang phục vụ";

            // Tạo Bill đang mở
            var bill = new Bill
            {
                Status = "Đang mở",
                TotalAmount = 0,
                Discount = 0,
                PaymentDate = DateTime.Now
            };

            await _context.SaveChangesAsync();

            // Gán Bill vào Order sau khi có OrderId
            bill.OrderId = order.OrderId;
            _context.Bills.Add(bill);
            await _context.SaveChangesAsync();

            return Ok(new { 
                orderId = order.OrderId, 
                billId = bill.BillId,
                tableId = table.TableId,
                tableName = table.Name,
                message = $"Đã tạo đơn cho {table.Name}"
            });
        }

        // =============================================
        // THÊM MÓN VÀO ĐƠN
        // =============================================
        [HttpPost("{orderId}/details")]
        public async Task<IActionResult> AddDetail(int orderId, [FromBody] AddDetailRequest request)
        {
            var order = await _context.Orders
                .Include(o => o.Bill)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null)
                return NotFound("Đơn hàng không tồn tại");

            if (order.Status != "Đang phục vụ")
                return BadRequest($"Đơn hàng đang có trạng thái: {order.Status}. Không thể thêm món.");

            // Kiểm tra sản phẩm tồn tại
            var product = await _context.Products.FindAsync(request.ProductId);
            if (product == null)
                return NotFound("Sản phẩm không tồn tại");

            // Thêm món
            var detail = new OrderDetail
            {
                OrderId = orderId,
                ProductId = request.ProductId,
                Quantity = request.Quantity,
                Status = "Đang chờ"
            };

            _context.OrderDetails.Add(detail);
            
            // Cập nhật tổng tiền Bill
            if (order.Bill != null)
            {
                order.Bill.TotalAmount += product.Price * request.Quantity;
            }

            await _context.SaveChangesAsync();

            return Ok(new { 
                detailId = detail.DetailId, 
                productName = product.Name,
                quantity = detail.Quantity,
                price = product.Price,
                subtotal = product.Price * request.Quantity,
                newTotal = order.Bill?.TotalAmount
            });
        }

        // =============================================
        // XÓA MÓN KHỎI ĐƠN
        // =============================================
        [HttpDelete("{orderId}/details/{detailId}")]
        public async Task<IActionResult> RemoveDetail(int orderId, int detailId)
        {
            var detail = await _context.OrderDetails
                .Include(d => d.Product)
                .Include(d => d.Order)
                    .ThenInclude(o => o!.Bill)
                .FirstOrDefaultAsync(d => d.DetailId == detailId && d.OrderId == orderId);

            if (detail == null)
                return NotFound("Không tìm thấy món trong đơn");

            if (detail.Order?.Status != "Đang phục vụ")
                return BadRequest("Đơn hàng không còn cho phép sửa");

            // Cập nhật tổng tiền
            if (detail.Order?.Bill != null)
            {
                detail.Order.Bill.TotalAmount -= (detail.Product?.Price ?? 0) * detail.Quantity;
            }

            _context.OrderDetails.Remove(detail);
            await _context.SaveChangesAsync();

            return Ok(new { 
                message = "Đã xóa món", 
                removedPrice = detail.Product?.Price * detail.Quantity,
                newTotal = detail.Order?.Bill?.TotalAmount
            });
        }

        // =============================================
        // CẬP NHẬT SỐ LƯỢNG MÓN
        // =============================================
        [HttpPut("{orderId}/details/{detailId}")]
        public async Task<IActionResult> UpdateDetailQuantity(int orderId, int detailId, [FromBody] UpdateDetailRequest request)
        {
            var detail = await _context.OrderDetails
                .Include(d => d.Product)
                .Include(d => d.Order)
                    .ThenInclude(o => o!.Bill)
                .FirstOrDefaultAsync(d => d.DetailId == detailId && d.OrderId == orderId);

            if (detail == null)
                return NotFound("Không tìm thấy món trong đơn");

            if (detail.Order?.Status != "Đang phục vụ")
                return BadRequest("Đơn hàng không còn cho phép sửa");

            if (request.Quantity <= 0)
                return BadRequest("Số lượng phải lớn hơn 0");

            // Tính lại tổng tiền
            var oldTotal = (detail.Product?.Price ?? 0) * detail.Quantity;
            var newTotal = (detail.Product?.Price ?? 0) * request.Quantity;

            detail.Quantity = request.Quantity;

            if (detail.Order?.Bill != null)
            {
                detail.Order.Bill.TotalAmount = detail.Order.Bill.TotalAmount - oldTotal + newTotal;
            }

            await _context.SaveChangesAsync();

            return Ok(new { 
                detailId = detail.DetailId,
                newQuantity = detail.Quantity,
                newTotal = detail.Order?.Bill?.TotalAmount
            });
        }

        // =============================================
        // CHUYỂN SANG CHỜ THANH TOÁN
        // =============================================
        [HttpPost("{orderId}/request-payment")]
        public async Task<IActionResult> RequestPayment(int orderId)
        {
            var order = await _context.Orders
                .Include(o => o.Table)
                .Include(o => o.Bill)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null)
                return NotFound("Đơn hàng không tồn tại");

            if (order.Status != "Đang phục vụ")
                return BadRequest($"Đơn hàng đang có trạng thái: {order.Status}");

            order.Status = "Chờ thanh toán";
            if (order.Bill != null)
                order.Bill.Status = "Chờ thanh toán";
            if (order.Table != null)
                order.Table.Status = "Chờ thanh toán";

            await _context.SaveChangesAsync();

            return Ok(new { 
                message = "Đã chuyển sang chờ thanh toán",
                totalAmount = order.Bill?.TotalAmount,
                discount = order.Bill?.Discount,
                finalAmount = (order.Bill?.TotalAmount ?? 0) - (order.Bill?.Discount ?? 0)
            });
        }

        // =============================================
        // HỦY ĐƠN
        // =============================================
        [HttpPost("{orderId}/cancel")]
        public async Task<IActionResult> CancelOrder(int orderId, [FromBody] CancelOrderRequest request)
        {
            var order = await _context.Orders
                .Include(o => o.Table)
                .Include(o => o.Bill)
                .Include(o => o.OrderDetails)
                .FirstOrDefaultAsync(o => o.OrderId == orderId);

            if (order == null)
                return NotFound("Đơn hàng không tồn tại");

            if (order.Status == "Đã thanh toán")
                return BadRequest("Không thể hủy đơn đã thanh toán");

            if (order.Status == "Đã hủy")
                return BadRequest("Đơn hàng đã bị hủy trước đó");

            // Xóa tất cả OrderDetails
            _context.OrderDetails.RemoveRange(order.OrderDetails);
            
            // Xóa Bill
            if (order.Bill != null)
                _context.Bills.Remove(order.Bill);

            // Cập nhật trạng thái
            order.Status = "Đã hủy";
            order.CancelNote = request.Reason;
            
            if (order.Table != null)
                order.Table.Status = "Trống";

            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã hủy đơn hàng", reason = request.Reason });
        }

        // DELETE: api/order/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null) return NotFound();

            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }

    public class CreateOrderRequest
    {
        public int TableId { get; set; }
    }

    public class AddDetailRequest
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; } = 1;
    }

    public class UpdateDetailRequest
    {
        public int Quantity { get; set; }
    }

    public class CancelOrderRequest
    {
        public string Reason { get; set; } = "";
    }
}
