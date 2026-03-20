using System.ComponentModel.DataAnnotations;

namespace NguyenVoAnhKiet_2122110562.Models
{
    public class Table
    {
        [Key]
        public int TableId { get; set; }

        [Required]
        public string TableName { get; set; }

        [Required]
        public string Status { get; set; } // Empty / Occupied
    }
}