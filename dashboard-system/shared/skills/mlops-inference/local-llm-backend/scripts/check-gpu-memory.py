#!/usr/bin/env python3
"""
Check available GPU/CPU memory to select appropriate model quantization.
Usage: python3 check-gpu-memory.py
"""
import torch
import subprocess
import sys

def format_gb(bytes_val):
    return f"{bytes_val / (1024**3):.1f} GB"

def main():
    print("=== Local LLM Memory Checker ===\n")

    # CPU RAM
    try:
        import psutil
        vm = psutil.virtual_memory()
        print(f"CPU RAM:  {format_gb(vm.total)} total, {format_gb(vm.available)} free ({vm.percent}% used)")
    except ImportError:
        print("CPU RAM:  psutil not installed")

    # GPU (NVIDIA)
    if torch.cuda.is_available():
        for i in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(i)
            total = props.total_memory
           allocated = torch.cuda.memory_allocated(i)
            reserved = torch.cuda.memory_reserved(i)
            free = total - allocated
            print(f"\nGPU {i} ({props.name}):")
            print(f"  Total:  {format_gb(total)}")
            print(f"  Allocated: {format_gb(allocated)}")
            print(f"  Reserved:  {format_gb(reserved)}")
            print(f"  Free:     {format_gb(free)}  ← usable for model")
    else:
        print("\nGPU:  No CUDA device detected — will run on CPU (slow).")

    # Quant size estimates (approx, Gemma 4 E4B)
    print("\n=== Gemma 4 E4B-it Quant Size Estimates ===")
    sizes = {
        "BF16": 14.4,
        "Q5_K_M": 4.6,
        "Q4_K_M": 4.5,
        "Q3_K_M": 3.9,
        "IQ4_NL": 4.6,
        "IQ4_XS": 4.5,
    }
    for quant, size_gb in sizes.items():
        fits = ""
        if torch.cuda.is_available():
            for i in range(torch.cuda.device_count()):
                free = torch.cuda.get_device_properties(i).total_memory - torch.cuda.memory_allocated(i)
                if size_gb * 1024**3 < free:
                    fits = "✓ Fits"
                else:
                    fits = "✗ Too large"
        print(f"  {quant:10s}  {size_gb:4.1f} GB  {fits}")

    # Recommendation
    print("\n→ Recommendation:")
    if torch.cuda.is_available():
        try:
            free_gb = (torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)) / (1024**3)
            if free_gb >= 8:
                print("   Q5_K_M or Q4_K_M (best quality)")
            elif free_gb >= 5:
                print("   Q4_K_M or Q3_K_M")
            else:
                print("   Q3_K_M only, or use CPU offloading")
        except:
            pass
    else:
        print("   CPU only: Use smallest quant (Q3_K_M) and expect slow speeds.")

if __name__ == "__main__":
    main()
