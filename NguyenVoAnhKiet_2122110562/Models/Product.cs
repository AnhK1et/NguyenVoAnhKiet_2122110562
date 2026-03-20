using System.ComponentModel.DataAnnotations;

namespace NguyenVoAnhKiet_2122110562.Models
{
    public class Product
    {
        [Key]
        public int ProductId { get; set; }

        [Required]
        public string Name { get; set; }

        [Required]
        public decimal Price { get; set; }

        public int CategoryId { get; set; }
    }
}