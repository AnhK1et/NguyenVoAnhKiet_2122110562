using System.ComponentModel.DataAnnotations;

namespace NguyenVoAnhKiet_2122110562.Models
{
    public class User
    {
        [Key]
        public int UserId { get; set; }

        [Required]
        public string Username { get; set; }

        [Required]
        public string Password { get; set; }

        [Required]
        public string Role { get; set; } // Admin / Staff
    }
}