package com.sharp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SharpApplication {

    public static void main(String[] args) {
        SpringApplication.run(SharpApplication.class, args);
    }
}
