// JDoodle language configurations
export const JDOODLE_LANGUAGE_CONFIG = {
    javascript: { language: "nodejs", versionIndex: "4", displayName: "JavaScript (Node.js)" },
    python: { language: "python3", versionIndex: "4", displayName: "Python 3" },
    java: { language: "java", versionIndex: "4", displayName: "Java" },
    cpp: { language: "cpp17", versionIndex: "1", displayName: "C++ 17" },
    c: { language: "c", versionIndex: "5", displayName: "C (GCC 11.1.0)" },
    csharp: { language: "csharp", versionIndex: "4", displayName: "C#" },
    ruby: { language: "ruby", versionIndex: "4", displayName: "Ruby" },
    php: { language: "php", versionIndex: "4", displayName: "PHP" },
    swift: { language: "swift", versionIndex: "4", displayName: "Swift" },
    go: { language: "go", versionIndex: "4", displayName: "Go" },
    kotlin: { language: "kotlin", versionIndex: "3", displayName: "Kotlin" },
    rust: { language: "rust", versionIndex: "4", displayName: "Rust" },
    scala: { language: "scala", versionIndex: "4", displayName: "Scala" },
  }
  
  // Default code templates for each language
  export const DEFAULT_CODE_TEMPLATES = {
    javascript: `// JavaScript (Node.js) code
  console.log("Hello, World!");`,
  
    python: `# Python code
  print("Hello, World!")`,
  
    java: `// Java code
  public class Main {
      public static void main(String[] args) {
          System.out.println("Hello, World!");
      }
  }`,
  
    cpp: `// C++ code
  #include <iostream>
  
  int main() {
      std::cout << "Hello, World!" << std::endl;
      return 0;
  }`,
  
    c: `// C code
  #include <stdio.h>
  
  int main() {
      printf("Hello, World!\\n");
      return 0;
  }`,
  
    csharp: `// C# code
  using System;
  
  class Program {
      static void Main() {
          Console.WriteLine("Hello, World!");
      }
  }`,
  
    ruby: `# Ruby code
  puts "Hello, World!"`,
  
    php: `<?php
  // PHP code
  echo "Hello, World!";
  ?>`,
  
    swift: `// Swift code
  print("Hello, World!")`,
  
    go: `// Go code
  package main
  
  import "fmt"
  
  func main() {
      fmt.Println("Hello, World!")
  }`,
  
    kotlin: `// Kotlin code
  fun main() {
      println("Hello, World!")
  }`,
  
    rust: `// Rust code
  fn main() {
      println!("Hello, World!");
  }`,
  
    scala: `// Scala code
  object Main extends App {
    println("Hello, World!")
  }`,
  }
  
  