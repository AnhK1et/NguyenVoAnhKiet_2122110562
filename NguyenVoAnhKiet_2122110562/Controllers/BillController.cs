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

        [HttpPost]
        public async Task<IActionResult> Create(Bill bill)
        {
            bill.PaymentDate = DateTime.Now;
            _context.Bills.Add(bill);
            await _context.SaveChangesAsync();
            return Ok(bill);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _context.Bills.ToListAsync());
        }
    }
}