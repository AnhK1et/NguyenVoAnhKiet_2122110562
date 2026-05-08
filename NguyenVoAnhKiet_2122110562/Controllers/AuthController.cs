using Microsoft.AspNetCore.Mvc;
using Microsoft.CodeAnalysis.Scripting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NguyenVoAnhKiet_2122110562.Data;
using NguyenVoAnhKiet_2122110562.Dtos;
using NguyenVoAnhKiet_2122110562.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace NguyenVoAnhKiet_2122110562.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { message = "Username và Password không được để trống" });
            }

            var existedUser = await _context.Users.FirstOrDefaultAsync(x => x.Username == dto.Username);
            if (existedUser != null)
            {
                return BadRequest(new { message = "Tên đăng nhập đã tồn tại" });
            }

            var user = new User
            {
                Username = dto.Username,
                Password = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = string.IsNullOrWhiteSpace(dto.Role) ? "Staff" : dto.Role,
                FullName = dto.FullName ?? ""
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đăng ký thành công" });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword()
        {
            var admin = await _context.Users.FirstOrDefaultAsync(x => x.Username == "admin");
            if (admin == null)
            {
                admin = new User { Username = "admin", Role = "Admin", FullName = "Quan ly" };
                _context.Users.Add(admin);
            }
            admin.Password = BCrypt.Net.BCrypt.HashPassword("123");
            await _context.SaveChangesAsync();
            return Ok(new { message = "Password reset thanh cong! Username: admin, Password: 123" });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            // Dùng raw SQL để tránh lỗi NULL từ EF Core
            var userId = 0;
            var username = "";
            var password = "";
            var role = "";
            var fullName = "";
            
            using (var connection = _context.Database.GetDbConnection())
            {
                await connection.OpenAsync();
                using var command = connection.CreateCommand();
                command.CommandText = "SELECT UserId, Username, Password, Role, ISNULL(FullName, '') FROM Users WHERE Username = @username";
                var param = command.CreateParameter();
                param.ParameterName = "@username";
                param.Value = dto.Username;
                command.Parameters.Add(param);
                
                using var reader = await command.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                {
                    return Unauthorized(new { message = "Sai tài khoản hoặc mật khẩu" });
                }
                
                userId = reader.GetInt32(0);
                username = reader.GetString(1);
                password = reader.GetString(2);
                role = reader.GetString(3);
                fullName = reader.GetString(4);
            }
            
            if (string.IsNullOrEmpty(password))
            {
                return Unauthorized(new { message = "Tài khoản chưa có mật khẩu" });
            }

            bool checkPassword = BCrypt.Net.BCrypt.Verify(dto.Password, password);
            
            if (!checkPassword)
            {
                return Unauthorized(new { message = "Sai tài khoản hoặc mật khẩu" });
            }

            var token = GenerateJwtToken(new User { UserId = userId, Username = username, Role = role, FullName = fullName });

            return Ok(new
            {
                message = "Đăng nhập thành công",
                token,
                username,
                userId,
                fullName,
                role
            });
        }

        private string GenerateJwtToken(User user)
        {
            var jwtKey = _configuration["Jwt:Key"];
            var jwtIssuer = _configuration["Jwt:Issuer"];

            var claims = new[]
            {
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("UserId", user.UserId.ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtIssuer,
                claims: claims,
                expires: DateTime.Now.AddHours(2),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}