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

        // 🔥 Lấy danh sách bàn
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _context.Tables.ToListAsync());
        }

        // 🔥 Thêm bàn
        [HttpPost]
        public async Task<IActionResult> Create(Table table)
        {
            _context.Tables.Add(table);
            await _context.SaveChangesAsync();
            return Ok(table);
        }

        // 🔥 Xóa bàn
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var table = await _context.Tables.FindAsync(id);
            if (table == null) return NotFound();

            _context.Tables.Remove(table);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}