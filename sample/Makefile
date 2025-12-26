vmlinux.h:
	bpftool btf dump file /sys/kernel/btf/vmlinux format c  > vmlinux.h

main.bpf.o: main.bpf.c
	clang \
		-O2 -g -Wall -Werror \
		-target bpf \
		-D__TARGET_ARCH_x86 \
		-c main.bpf.c \
		-o main.bpf.o

load: main.bpf.o
	sudo bpftool prog load ./main.bpf.o /sys/fs/bpf/sample 2>&1 | tee verifier.log

clean:
	rm main.bpf.o
	rm verifier.log