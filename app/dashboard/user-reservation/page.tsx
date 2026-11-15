"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Crown, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageHeading, PanelState } from "@/components/admin/PageHeading";
import { adminApi } from "@/lib/admin-api";
type Customer = {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  altContact?: string;
  altContactType?: string;
  provider: string;
  membershipType?: string;
};
const contactNames: Record<string, string> = {
  wechat: "微信",
  instagram: "Instagram",
  kakao: "KakaoTalk",
  phone: "电话",
  email: "邮箱",
};
export default function CustomersPage() {
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<Customer[]>([]),
    [searched, setSearched] = useState(false),
    [busy, setBusy] = useState(false),
    [vipOnly, setVipOnly] = useState(false),
    [page, setPage] = useState(1),
    [error, setError] = useState("");
  const filtered = useMemo(
    () =>
      vipOnly
        ? results.filter((user) => user.membershipType?.toLowerCase() === "vip")
        : results,
    [results, vipOnly],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError("");
    setPage(1);
    try {
      const data = await adminApi<{ users: Customer[] }>(
        "/api/searchUsers?query=" + encodeURIComponent(query.trim()),
      );
      setResults(data.users || []);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "搜索失败，请重试");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <PageHeading
        eyebrow="EVERY CUSTOMER, A FAMILIAR FACE"
        title="顾客管理"
        description="找到熟悉的名字，安排新的相见。预约、会员与顾客偏好，都在这里。"
      />
      <section className="admin-panel customer-search-panel">
        <form className="customer-search-form" onSubmit={search}>
          <div className="customer-search-input">
            <Search size={17} />
            <Input
              aria-label="搜索顾客"
              placeholder="姓名、邮箱或联系方式"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy || !query.trim()}>
            <Search size={15} />
            {busy ? "搜索中…" : "搜索"}
          </Button>
        </form>
        <div className="customer-filter-row">
          <label className="customer-vip-filter">
            <Switch
              checked={vipOnly}
              onCheckedChange={(value) => {
                setVipOnly(value);
                setPage(1);
              }}
              aria-label="仅显示 VIP 顾客"
            />
            <Crown size={14} />
            仅显示 VIP 顾客
          </label>
          <span>{searched ? `${filtered.length} 位顾客` : "按关键词查找"}</span>
        </div>
      </section>
      {error && (
        <div className="admin-error" role="alert">
          {error}
        </div>
      )}
      <section className="admin-panel customer-list">
        {busy ? (
          <PanelState loading title="正在寻找顾客…" />
        ) : !searched ? (
          <PanelState title="从一个名字开始">
            <Users size={22} />
            <p>输入姓名、邮箱或联系方式，即可查看顾客资料。</p>
          </PanelState>
        ) : !filtered.length ? (
          <PanelState title="暂时没有找到匹配的顾客">
            <p>试试其他关键词，或关闭 VIP 筛选。</p>
          </PanelState>
        ) : (
          <>
            <div className="customer-list-head">
              <span>顾客</span>
              <span>联系方式</span>
              <span>会员状态</span>
              <span />
            </div>
            {filtered.slice((page - 1) * 8, page * 8).map((user) => (
              <Link
                key={user.id}
                className="customer-list-row"
                href={`/dashboard/user-reservation/user-detail?userId=${encodeURIComponent(user.id)}`}
              >
                <div className="customer-list-name">
                  <span className="admin-avatar">
                    {(user.name || user.username || "?")
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                  <div>
                    <strong>
                      {user.name || user.username || "未填写姓名"}
                    </strong>
                    <small>{user.username || user.provider}</small>
                  </div>
                </div>
                <div className="customer-list-contact">
                  {user.altContact || user.email || "暂未填写"}
                  <small>
                    {user.altContact
                      ? contactNames[user.altContactType || ""] ||
                        user.altContactType ||
                        "联系方式"
                      : "邮箱"}
                  </small>
                </div>
                <span
                  className={`admin-chip ${user.membershipType === "vip" ? "yellow" : "neutral"}`}
                >
                  {user.membershipType === "vip" && <Crown size={11} />}{" "}
                  {user.membershipType === "vip" ? "VIP 会员" : "普通顾客"}
                </span>
                <ChevronRight size={15} />
              </Link>
            ))}
          </>
        )}
      </section>
      {searched && filtered.length > 0 && (
        <div className="admin-pagination">
          <span>
            第 {(page - 1) * 8 + 1}–{Math.min(page * 8, filtered.length)} 位，共{" "}
            {filtered.length} 位
          </span>
          <div className="admin-inline">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((n) => n - 1)}
              aria-label="上一页"
            >
              <ChevronLeft size={14} />
            </Button>
            <span>
              {page} / {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage((n) => n + 1)}
              aria-label="下一页"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
