using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NguyenVoAnhKiet_2122110562.Data;
using NguyenVoAnhKiet_2122110562.Models;

[Route("api/[controller]")]
[ApiController]
public class OrderDetailController : ControllerBase
{
    private readonly AppDbContext _context;

    public OrderDetailController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> Create(OrderDetail detail)
    {
        _context.OrderDetails.Add(detail);
        await _context.SaveChangesAsync();
        return Ok(detail);
    }

    [HttpGet("order/{orderId}")]
    public async Task<IActionResult> GetByOrder(int orderId)
    {
        var data = await _context.OrderDetails
            .Where(x => x.OrderId == orderId)
            .Include(x => x.Product)
            .ToListAsync();

        return Ok(data);
    }
}