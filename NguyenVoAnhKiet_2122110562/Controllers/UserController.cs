using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NguyenVoAnhKiet_2122110562.Data;
using NguyenVoAnhKiet_2122110562.Models;

[Route("api/[controller]")]
[ApiController]
public class UserController : ControllerBase
{
    private readonly AppDbContext _context;

    public UserController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(User user)
    {
        var exist = await _context.Users
            .AnyAsync(x => x.Username == user.Username);

        if (exist)
            return BadRequest("Username đã tồn tại");

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(user);
    }
}