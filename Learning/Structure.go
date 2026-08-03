// package main

// import "fmt"

// type car struct {
// 	Name  string
// 	modle string
// 	year  int
// }

// func main() {
// 	c := car{
// 		Name:  "Honda Civic",
// 		modle: "Honda",
// 		year:  2024,
// 	}

// 	fmt.Println(c)
// 	fmt.Println(c.Name)
// 	fmt.Println(c.year)
// 	fmt.Println(c.modle)
// 	c.Name = "Bugatti chiron"
// 	fmt.Println(c.Name)
// 	c.modle = "Bugatti"
// 	fmt.Println(c.modle)
// 	c.year = 2026
// 	fmt.Println(c.year)
// }

// package main

// import "fmt"

// type Students struct {
// 	Name string
// 	age  int
// 	gpa  float32
// }

// func main() {
// 	s := Students{
// 		Name: "Salman",
// 		age:  24,
// 		gpa:  3.50,
// 	}

// 	fmt.Println(s)
// 	fmt.Println(s.Name)
// 	fmt.Println(s.age)
// 	fmt.Println(s.gpa)
// 	s.Name = "Saeed"
// 	fmt.Println(s.Name)
// 	s.age = 22
// 	fmt.Println(s.age)
// 	s.gpa = 3.8
// 	fmt.Print(s.age)
// }

// package main

// import "fmt"

// type Book struct {
// 	Title  string
// 	Author string
// 	Price  float32
// }

// func main() {
// 	b := Book{
// 		Title:  "48 Laws Of Power",
// 		Author: "Robert Greene",
// 		Price:  2000,
// 	}
// 	fmt.Println(b)
// }

// package main

// import "fmt"

// type Employee struct {
// 	Name       string
// 	salary     int
// 	department string
// }

// func main() {
// 	e := Employee{
// 		Name:       "Ahmad",
// 		salary:     15000,
// 		department: "Software Engineering",
// 	}

// 	fmt.Println(e.salary)
// }

// package main

// import "fmt"

// type Person struct {
// 	Name string
// 	age  int
// }

// func (P Person) greet() {
// 	fmt.Println("Assalam o Alaikum", P.Name)
// }

// func main() {
// 	p := Person{Name: "Salman"}
// 	p.greet()
// }

// package main

// import "fmt"

// type Car struct {
// 	Brand string
// }

// func (c Car) Brands() {
// 	fmt.Println("My favourite Brand is :", c.Brand)
// }

// func main() {
// 	c := Car{
// 		Brand: "Lambourgini",
// 	}
// 	c.Brands()
// }

// package main

// import "fmt"

// type Rectangle struct {
// 	Length float32
// 	Width  float32
// }

// func (r Rectangle) Area() float32 {
// 	return r.Length * r.Width
// }

// func main() {
// 	rect := Rectangle{19, 10}

// 	fmt.Println(rect.Area())
// }

package main
