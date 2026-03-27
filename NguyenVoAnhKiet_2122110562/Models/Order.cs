using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NguyenVoAnhKiet_2122110562.Models
{
    public class Order
    {
        [Key]
        public int OrderId { get; set; }

        [Required]
        public int TableId { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public string Status { get; set; } = string.Empty;

        // 🔥 THÊM DÒNG NÀY
        [ForeignKey("TableId")]
        public Table? Table { get; set; }
    }
}