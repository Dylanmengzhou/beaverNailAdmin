"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BsWechat } from "react-icons/bs";
import { PiPhoneFill } from "react-icons/pi";
import { MdEmail } from "react-icons/md";
import { RiKakaoTalkFill } from "react-icons/ri";
import { BiLogoInstagramAlt } from "react-icons/bi";
import { FaQuestion } from "react-icons/fa";
import { FaUser } from "react-icons/fa";
import { FaAngleLeft } from "react-icons/fa6";

// 用户类型定义
type User = {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  image?: string;
  gender?: string;
  provider: string;
  altContact?: string;
  altContactType?: string;
  contactType?: string;
  membershipType?: string;
};

export default function UserReservationPage() {
  const router = useRouter();
  // 当前登录用户
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    memberType: string;
  } | null>(null);

  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [originalSearchResults, setOriginalSearchResults] = useState<User[]>(
    []
  );
  const [isSearching, setIsSearching] = useState(false);
  const [vipOnly, setVipOnly] = useState(false);

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(1); // 每页显示1条结果

  // 添加响应式状态
  const [isMobile, setIsMobile] = useState(false);

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 认证和权限检查
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/");
      return;
    }

    try {
      // 解析JWT获取用户信息
      const tokenParts = token.split(".");
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        setCurrentUser({
          id: payload.id,
          username: payload.username,
          memberType: payload.memberType,
        });
      }
    } catch (error) {
      console.error("解析token失败:", error);
      router.push("/");
    }
  }, [router]);

  // 权限检查
  useEffect(() => {
    if (currentUser) {
      // 检查用户权限，如果不是 manager 或 staff 则返回首页
      if (!["manager", "staff"].includes(currentUser.memberType)) {
        toast.error("只有经理或员工才能访问此页面", {
          duration: 3000,
          position: "top-center",
        });
        router.push("/");
      }
    }
  }, [currentUser, router]);

  // 过滤用户结果
  const filterUsers = (users: User[]) => {
    if (!vipOnly) {
      return users;
    }
    return users.filter(
      (user) =>
        user.membershipType && user.membershipType.toLowerCase() === "vip"
    );
  };

  // VIP筛选状态改变时重新过滤结果
  useEffect(() => {
    if (originalSearchResults.length > 0) {
      const filtered = filterUsers(originalSearchResults);
      setSearchResults(filtered);
      setCurrentPage(1); // 重置到第一页
    }
  }, [vipOnly, originalSearchResults]);

  // 计算当前页应该显示的结果
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = searchResults.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(searchResults.length / itemsPerPage);

  // 页码改变的处理函数
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // 上一页
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // 下一页
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // 搜索用户
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("请输入搜索关键词", {
        duration: 3000,
        position: "top-center",
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setCurrentPage(1); // 重置为第一页

    try {
      const response = await fetch(
        `/api/searchUsers?query=${encodeURIComponent(searchQuery)}`
      );
      if (!response.ok) {
        throw new Error("搜索用户失败");
      }

      const data = await response.json();
      if (data.success) {
        // 保存原始搜索结果
        setOriginalSearchResults(data.users);
        // 应用VIP过滤
        const filteredResults = filterUsers(data.users);
        setSearchResults(filteredResults);
      } else {
        toast.error(data.message || "搜索用户失败", {
          duration: 3000,
          position: "top-center",
        });
      }
    } catch (error) {
      console.error("搜索用户失败:", error);
      toast.error("搜索用户失败，请稍后再试", {
        duration: 3000,
        position: "top-center",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // 选择用户（跳转到用户详情页）
  const handleSelectUser = (user: User) => {
    // 跳转到用户详情页面
    router.push(`/dashboard/user-reservation/user-detail?userId=${user.id}`);
  };

  // 在组件函数内添加这个辅助函数
  const renderContactIcon = (contactType?: string) => {
    switch (contactType?.toLowerCase()) {
      case "wechat":
        return (
          <div className="inline-flex items-center justify-center p-1.5 rounded-full bg-green-100 text-green-600">
            <BsWechat className="h-4 w-4" />
          </div>
        );
      case "instagram":
        return (
          <div className="inline-flex items-center justify-center p-1.5 rounded-full bg-purple-100 text-purple-600">
            <BiLogoInstagramAlt className="h-4 w-4" />
          </div>
        );
      case "kakao":
        return (
          <div className="inline-flex items-center justify-center p-1.5 rounded-full bg-yellow-100 text-yellow-700">
            <RiKakaoTalkFill className="h-4 w-4" />
          </div>
        );
      case "phone":
        return (
          <div className="inline-flex items-center justify-center p-1.5 rounded-full bg-blue-100 text-blue-600">
            <PiPhoneFill className="h-4 w-4" />
          </div>
        );
      case "email":
        return (
          <div className="inline-flex items-center justify-center p-1.5 rounded-full bg-red-100 text-red-600">
            <MdEmail className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center justify-center p-1.5 rounded-full bg-gray-100 text-gray-600">
            <FaQuestion className="h-4 w-4" />
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto py-4 px-3 sm:py-6 sm:px-6 max-w-6xl">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="shadow-none p-1 hover:bg-pink-50"
            onClick={() => router.push("/dashboard")}
          >
            <FaAngleLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">返回</span>
          </Button>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-pink-600 flex-1 text-center">
            用户管理
          </h1>
          <div className="w-12 sm:w-16"></div> {/* 占位符保持布局平衡 */}
        </div>

        <p className="text-gray-500 text-center text-sm sm:text-base mt-2">
          搜索用户，点击用户卡片进入详细管理页面
        </p>
      </div>

      {/* 搜索区域 */}
      <Card className="mb-6 sm:mb-8 shadow-md border-pink-100 bg-white">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-pink-600 text-lg sm:text-xl">
            搜索用户
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Input
                  placeholder="输入用户名、邮箱或昵称"
                  className="bg-white/80 py-3 sm:py-4 px-4 pl-10 border-pink-200 focus:border-pink-400 focus:ring-pink-400 rounded-xl text-sm sm:text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 sm:h-5 sm:w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white py-3 sm:py-4 px-6 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center text-sm sm:text-base"
                onClick={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    搜索中...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clipRule="evenodd"
                      />
                    </svg>
                    搜索
                  </span>
                )}
              </Button>
            </div>

            {/* VIP过滤选项 */}
            <div
              className={`flex items-center space-x-3 p-3 sm:p-4 rounded-lg border transition-colors ${
                vipOnly
                  ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <input
                type="checkbox"
                id="vip-only"
                checked={vipOnly}
                onChange={(e) => setVipOnly(e.target.checked)}
                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-yellow-300 rounded"
              />
              <label
                htmlFor="vip-only"
                className={`text-sm font-medium flex items-center cursor-pointer flex-1 ${
                  vipOnly ? "text-yellow-700" : "text-gray-700"
                }`}
              >
                <span className="mr-2">👑</span>
                <span>仅限VIP用户</span>
                {vipOnly && (
                  <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full">
                    已启用
                  </span>
                )}
              </label>
              {hasSearched && (
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {vipOnly
                    ? `${searchResults.length}/${originalSearchResults.length}`
                    : `${originalSearchResults.length}`}{" "}
                  位用户
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 结果区域固定高度容器 */}
      <div className="min-h-[300px] sm:min-h-[400px] flex flex-col justify-center">
        {/* 搜索中显示加载状态 */}
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-pink-600 text-sm sm:text-base">
              正在搜索用户...
            </p>
          </div>
        )}

        {/* 未搜索时显示提示文本 */}
        {!hasSearched && !isSearching && (
          <div className="text-center py-8 sm:py-12 text-gray-400">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <p className="text-sm sm:text-base">请输入关键词开始搜索用户</p>
          </div>
        )}

        {/* 搜索结果为空时显示提示 */}
        {hasSearched && !isSearching && searchResults.length === 0 && (
          <Card className="shadow-md border-pink-100 bg-white">
            <CardContent className="py-8 sm:py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 sm:h-8 sm:w-8 text-pink-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-medium text-pink-600 mb-2">
                  没有找到匹配的用户
                </h3>
                <p className="text-gray-500 max-w-md text-sm sm:text-base px-4">
                  尝试使用不同的关键词，或者检查用户是否已经注册
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 搜索结果 - 只有有结果时才显示 */}
        {hasSearched && !isSearching && searchResults.length > 0 && (
          <div className="space-y-4">
            {/* 分页导航 - 移动端放在顶部 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-pink-100 shadow-sm">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 sm:h-4 sm:w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span className="hidden sm:inline">上一页</span>
                </Button>

                <div className="flex items-center gap-1 sm:gap-2">
                  {(() => {
                    const pageNumbers = [];
                    const maxPageButtons = isMobile ? 3 : 5;

                    if (totalPages <= maxPageButtons) {
                      // 如果总页数不多，显示所有页码
                      for (let i = 1; i <= totalPages; i++) {
                        pageNumbers.push(i);
                      }
                    } else {
                      // 复杂情况下的页码显示逻辑
                      pageNumbers.push(1);

                      if (currentPage > 3) {
                        pageNumbers.push("ellipsis-start");
                      }

                      const start = Math.max(2, currentPage - 1);
                      const end = Math.min(totalPages - 1, currentPage + 1);

                      for (let i = start; i <= end; i++) {
                        if (
                          i !== 1 &&
                          i !== totalPages &&
                          !pageNumbers.includes(i)
                        ) {
                          pageNumbers.push(i);
                        }
                      }

                      if (currentPage < totalPages - 2) {
                        pageNumbers.push("ellipsis-end");
                      }

                      if (totalPages > 1) {
                        pageNumbers.push(totalPages);
                      }
                    }

                    return pageNumbers.map((page, index) => {
                      if (
                        page === "ellipsis-start" ||
                        page === "ellipsis-end"
                      ) {
                        return (
                          <span
                            key={page}
                            className="px-1 text-gray-500 text-xs"
                          >
                            ...
                          </span>
                        );
                      }

                      return (
                        <Button
                          key={index}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page as number)}
                          className={`h-6 w-6 sm:h-8 sm:w-8 p-0 text-xs sm:text-sm ${
                            currentPage === page
                              ? "bg-pink-500 text-white"
                              : "border-pink-200 text-pink-700"
                          }`}
                        >
                          {page}
                        </Button>
                      );
                    });
                  })()}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9"
                >
                  <span className="hidden sm:inline">下一页</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 sm:h-4 sm:w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Button>
              </div>
            )}

            <Card className="shadow-md border-pink-100 bg-white">
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-1 sm:w-1.5 h-4 sm:h-5 bg-gradient-to-b from-pink-500 to-purple-500 rounded-full mr-2"></div>
                    <CardTitle className="text-pink-600 text-base sm:text-lg">
                      搜索结果
                    </CardTitle>
                    <span className="ml-2 text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
                      {searchResults.length}位用户
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 sm:space-y-4">
                  {currentItems.map((user) => (
                    <div
                      key={user.id}
                      className="border p-3 sm:p-4 rounded-lg transition-all cursor-pointer hover:shadow-md border-gray-200 hover:border-pink-300 active:bg-pink-50"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="space-y-3">
                        {/* 用户基本信息 */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-pink-700 text-sm sm:text-base truncate">
                              {user.name || user.username || "匿名用户"}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 ml-3 shrink-0">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                              <FaUser className="h-3 w-3 mr-1" />
                              {user.provider || "未知"}
                            </span>
                            {user.membershipType && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  user.membershipType.toLowerCase() === "vip"
                                    ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {user.membershipType.toLowerCase() ===
                                  "vip" && <span className="mr-1">👑</span>}
                                {user.membershipType.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 联系方式信息 */}
                        <div className="space-y-2 sm:space-y-3">
                          <div>
                            <div className="text-xs text-gray-500 font-medium mb-1">
                              主要联系方式
                            </div>
                            <div className="flex items-center gap-2">
                              {renderContactIcon(user.contactType)}
                              <div className="text-sm text-gray-700 truncate flex-1 min-w-0">
                                {user.email || "无"}
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-gray-500 font-medium mb-1">
                              备选联系方式
                            </div>
                            <div className="flex items-center gap-2">
                              {renderContactIcon(user.altContactType)}
                              <div className="text-sm text-gray-700 truncate flex-1 min-w-0">
                                {user.altContact || "无"}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 点击提示 */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-400">
                            点击进入详细管理
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-pink-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
