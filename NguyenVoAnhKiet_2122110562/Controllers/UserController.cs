using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NguyenVoAnhKiet_2122110562.Data;
using NguyenVoAnhKiet_2122110562.Dtos;
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

    // GET: api/User - Lấy danh sách users (không trả password)
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _context.Users
            .Select(u => new {
                u.UserId,
                u.Username,
                u.FullName,
                u.Role
            })
            .ToListAsync();

        return Ok(users);
    }

    // GET: api/User/5
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _context.Users
            .Select(u => new {
                u.UserId,
                u.Username,
                u.FullName,
                u.Role
            })
            .FirstOrDefaultAsync(u => u.UserId == id);

        if (user == null) return NotFound();
        return Ok(user);
    }

    // PUT: api/User/5 - Cập nhật user
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest request)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound("User không tồn tại");

        // Kiểm tra username trùng (nếu đổi username)
        if (!string.IsNullOrEmpty(request.Username) && request.Username != user.Username)
        {
            var exist = await _context.Users.AnyAsync(u => u.Username == request.Username && u.UserId != id);
            if (exist) return BadRequest("Tên đăng nhập đã tồn tại");
            user.Username = request.Username;
        }

        if (!string.IsNullOrEmpty(request.FullName))
            user.FullName = request.FullName;

        if (!string.IsNullOrEmpty(request.Role))
            user.Role = request.Role;

        if (!string.IsNullOrEmpty(request.Password))
            user.Password = BCrypt.Net.BCrypt.HashPassword(request.Password);

        await _context.SaveChangesAsync();

        return Ok(new {
            user.UserId,
            user.Username,
            user.FullName,
            user.Role,
            message = "Cập nhật thành công"
        });
    }

    // DELETE: api/User/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound("User không tồn tại");

        // Không cho xóa chính mình
        var currentUserId = User.FindFirst("UserId")?.Value;
        if (currentUserId != null && int.TryParse(currentUserId, out int currId) && currId == id)
            return BadRequest("Không thể xóa tài khoản đang đăng nhập");

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã xóa tài khoản" });
    }
}

public class UpdateUserRequest
{
    public string? Username { get; set; }
    public string? FullName { get; set; }
    public string? Role { get; set; }
    public string? Password { get; set; }
}

