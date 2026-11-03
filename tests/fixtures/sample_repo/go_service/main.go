package main

import "fmt"

func activeGoWorker() string {
	return "healthy"
}

func DeadGoFunction() string {
	return "unreachable"
}

func main() {
	res := activeGoWorker()
	fmt.Println(res)
}
