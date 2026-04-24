using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NguyenVoAnhKiet_2122110562.Data;
using NguyenVoAnhKiet_2122110562.Models;

namespace NguyenVoAnhKiet_2122110562.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TableController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TableController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/table
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var tables = await _context.Tables.ToListAsync();
            return Ok(tables);
        }

        // GET: api/table/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var table = await _context.Tables.FindAsync(id);
            if (table == null) return NotFound();
            return Ok(table);
        }

        // PUT: api/table/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Table tableData)
        {
            var table = await _context.Tables.FindAsync(id);
            if (table == null) return NotFound();

            table.Name = tableData.Name;
            table.Status = tableData.Status;

            await _context.SaveChangesAsync();
            return Ok(table);
        }

        // =============================================
        // CHUYỂN BÀN
        // =============================================
        // POST: api/table/transfer
        [HttpPost("transfer")]
        public async Task<IActionResult> TransferTable([FromBody] TransferRequest request)
        {
            var sourceTable = await _context.Tables.FindAsync(request.SourceTableId);
            var targetTable = await _context.Tables.FindAsync(request.TargetTableId);

            if (sourceTable == null || targetTable == null)
                return NotFound("Bàn không tồn tại");

            // Kiểm tra bàn đích không được trống (đang có khách)
            if (targetTable.Status != "Trống")
                return BadRequest("Bàn đích đang có khách. Vui lòng chọn bàn trống hoặc dùng chức năng gộp bàn.");

            // Kiểm tra bàn nguồn có đơn không
            var sourceOrder = await _context.Orders
                .Where(o => o.TableId == sourceTable.TableId && o.Status == "Đang phục vụ")
                .FirstOrDefaultAsync();

            if (sourceOrder == null)
                return BadRequest("Bàn nguồn không có đơn hàng nào đang phục vụ");

            // Chuyển đơn sang bàn mới
            sourceOrder.TableId = targetTable.TableId;
            targetTable.Status = "Đang phục vụ";
            sourceTable.Status = "Trống";

            await _context.SaveChangesAsync();

            return Ok(new { 
                message = $"Đã chuyển đơn từ {sourceTable.Name} sang {targetTable.Name}",
                orderId = sourceOrder.OrderId,
                newTableId = targetTable.TableId
            });
        }

        // =============================================
        // GỘP BÀN
        // =============================================
        // POST: api/table/merge
        [HttpPost("merge")]
        public async Task<IActionResult> MergeTable([FromBody] MergeRequest request)
        {
            var mainTable = await _context.Tables.FindAsync(request.MainTableId);
            var subTable = await _context.Tables.FindAsync(request.SubTableId);

            if (mainTable == null || subTable == null)
                return NotFound("Bàn không tồn tại");

            // Kiểm tra bàn chính có đơn đang phục vụ
            var mainOrder = await _context.Orders
                .Where(o => o.TableId == mainTable.TableId && o.Status == "Đang phục vụ")
                .FirstOrDefaultAsync();

            // Kiểm tra bàn phụ có đơn đang phục vụ
            var subOrder = await _context.Orders
                .Where(o => o.TableId == subTable.TableId && o.Status == "Đang phục vụ")
                .FirstOrDefaultAsync();

            if (mainOrder == null)
                return BadRequest("Bàn chính không có đơn hàng đang phục vụ");

            if (subOrder == null)
                return BadRequest("Bàn phụ không có đơn hàng đang phục vụ");

            // Chuyển tất cả OrderDetails từ bàn phụ sang bàn chính
            var subDetails = await _context.OrderDetails
                .Where(d => d.OrderId == subOrder.OrderId)
                .ToListAsync();

            foreach (var detail in subDetails)
            {
                detail.OrderId = mainOrder.OrderId;
            }

            // Xóa đơn phụ và cập nhật trạng thái bàn
            _context.Orders.Remove(subOrder);
            subTable.Status = "Trống";

            await _context.SaveChangesAsync();

            return Ok(new { 
                message = $"Đã gộp {subTable.Name} vào {mainTable.Name}",
                mainOrderId = mainOrder.OrderId,
                mergedDetailsCount = subDetails.Count
            });
        }

        // =============================================
        // TÁCH BÀN
        // =============================================
        // POST: api/table/split
        [HttpPost("split")]
        public async Task<IActionResult> SplitTable([FromBody] SplitRequest request)
        {
            var sourceTable = await _context.Tables.FindAsync(request.SourceTableId);
            var targetTable = await _context.Tables.FindAsync(request.TargetTableId);

            if (sourceTable == null || targetTable == null)
                return NotFound("Bàn không tồn tại");

            if (targetTable.Status != "Trống")
                return BadRequest("Bàn đích đang có khách. Vui lòng chọn bàn trống.");

            // Lấy đơn nguồn
            var sourceOrder = await _context.Orders
                .Where(o => o.TableId == sourceTable.TableId && o.Status == "Đang phục vụ")
                .Include(o => o.OrderDetails)
                .FirstOrDefaultAsync();

            if (sourceOrder == null)
                return BadRequest("Bàn nguồn không có đơn hàng đang phục vụ");

            // Tạo đơn mới cho bàn đích
            var newOrder = new Order
            {
                TableId = targetTable.TableId,
                CreatedAt = DateTime.Now,
                Status = "Đang phục vụ"
            };
            _context.Orders.Add(newOrder);
            await _context.SaveChangesAsync();

            // Chuyển các món được chọn sang đơn mới
            foreach (var detailId in request.DetailIds)
            {
                var detail = await _context.OrderDetails.FindAsync(detailId);
                if (detail != null && detail.OrderId == sourceOrder.OrderId)
                {
                    detail.OrderId = newOrder.OrderId;
                }
            }

            targetTable.Status = "Đang phục vụ";
            await _context.SaveChangesAsync();

            return Ok(new { 
                message = $"Đã tách món từ {sourceTable.Name} sang {targetTable.Name}",
                newOrderId = newOrder.OrderId,
                sourceOrderId = sourceOrder.OrderId,
                transferredDetails = request.DetailIds.Count
            });
        }
    }

    public class TransferRequest
    {
        public int SourceTableId { get; set; }
        public int TargetTableId { get; set; }
    }

    public class MergeRequest
    {
        public int MainTableId { get; set; }
        public int SubTableId { get; set; }
    }

    public class SplitRequest
    {
        public int SourceTableId { get; set; }
        public int TargetTableId { get; set; }
        public List<int> DetailIds { get; set; } = new List<int>();
    }
}
