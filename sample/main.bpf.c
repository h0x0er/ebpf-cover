
#include "vmlinux.h"
#include <bpf/bpf_core_read.h>
#include <bpf/bpf_endian.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>

char __license[] SEC("license") = "GPL";

struct {
  __uint(type, BPF_MAP_TYPE_RINGBUF);
  __uint(max_entries, 1 << 26);
} events SEC(".maps");

struct event {
  u8 kind;
  u8 data[255];
};

SEC("cgroup_skb/egress")
int handle_egress(struct __sk_buff *skb) {

  struct event *eve = bpf_ringbuf_reserve(&events, sizeof(struct event), 0);

  if (!eve) {
    return SK_PASS;
  }

  

  return SK_PASS;
}