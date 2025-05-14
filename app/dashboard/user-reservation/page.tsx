"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { BsWechat } from "react-icons/bs";
import { PiPhoneFill } from "react-icons/pi";
import { MdEmail } from "react-icons/md";
import { RiKakaoTalkFill } from "react-icons/ri";
import { BiLogoInstagramAlt } from "react-icons/bi";
import { FaQuestion } from "react-icons/fa";
import { FaUser } from "react-icons/fa";

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
};

// 美甲师类型定义
type NailArtist = {
  id: string;
  name: string;
  role: string;
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
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(1); // 每页显示5条结果

  // 预约相关状态
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [nailArtists, setNailArtists] = useState<NailArtist[]>([]);
  const [selectedNailArtist, setSelectedNailArtist] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        toast.error("只有经理或员工才能访问此页面");
        router.push("/");
      }
    }
  }, [currentUser, router]);

  // 加载美甲师数据
  useEffect(() => {
    const fetchNailArtists = async () => {
      try {
        const response = await fetch("/api/getNailArtists");
        if (!response.ok) {
          throw new Error("获取美甲师列表失败");
        }

        const data = await response.json();
        if (data.success) {
          setNailArtists(data.nailArtists);
        }
      } catch (error) {
        console.error("获取美甲师失败:", error);
        toast.error("获取美甲师失败，请稍后再试");
      }
    };

    if (currentUser) {
      fetchNailArtists();
    }
  }, [currentUser]);

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
      toast.error("请输入搜索关键词");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setSelectedUser(null);
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
        setSearchResults(data.users);
      } else {
        toast.error(data.message || "搜索用户失败");
      }
    } catch (error) {
      console.error("搜索用户失败:", error);
      toast.error("搜索用户失败，请稍后再试");
    } finally {
      setIsSearching(false);
    }
  };

  // 选择用户
  const handleSelectUser = (user: User) => {
    if (selectedUser && selectedUser.id === user.id) {
      // 取消选择
      setSelectedUser(null);
    } else {
      // 选择用户
      setSelectedUser(user);
    }
  };

  // 获取可用时间段
  const fetchAvailableTimeSlots = async () => {
    if (!selectedDate || !selectedNailArtist) {
      setAvailableTimeSlots([]);
      return;
    }

    setIsLoadingTimeSlots(true);

    try {
      const response = await fetch(
        `/api/getAvailableTimeSlots?date=${encodeURIComponent(
          selectedDate
        )}&nailArtistId=${encodeURIComponent(selectedNailArtist)}`
      );

      if (!response.ok) {
        throw new Error("获取可用时间段失败");
      }

      const data = await response.json();
      if (data.success) {
        setAvailableTimeSlots(data.availableTimeSlots);
        setSelectedTimeSlot(""); // 重置选择的时间段
      } else {
        toast.error(data.message || "获取可用时间段失败");
      }
    } catch (error) {
      console.error("获取可用时间段失败:", error);
      toast.error("获取可用时间段失败，请稍后再试");
    } finally {
      setIsLoadingTimeSlots(false);
    }
  };

  // 当选择日期或美甲师时获取可用时间段
  useEffect(() => {
    fetchAvailableTimeSlots();
  }, [selectedDate, selectedNailArtist]);

  // 验证并提交预约
  const handleSubmitReservation = async () => {
    if (!selectedUser) {
      toast.error("请先选择用户");
      return;
    }

    if (!selectedNailArtist) {
      toast.error("请选择美甲师");
      return;
    }

    if (!selectedDate) {
      toast.error("请选择日期");
      return;
    }

    if (!selectedTimeSlot) {
      toast.error("请选择时间段");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/createReservation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          loginUser: currentUser?.username,
          userId: selectedUser.id,
          nailArtistId: selectedNailArtist,
          date: selectedDate,
          timeSlot: selectedTimeSlot,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("预约创建成功！");
        // 重置表单
        setSelectedUser(null);
        setSelectedNailArtist("");
        setSelectedDate("");
        setSelectedTimeSlot("");
        setShowReservationForm(false);
        setSearchQuery("");
        setSearchResults([]);
        setHasSearched(false);
      } else {
        toast.error(data.message || "创建预约失败");
      }
    } catch (error) {
      console.error("创建预约失败:", error);
      toast.error("创建预约失败，请稍后再试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取今天的日期
  const today = new Date().toISOString().split("T")[0];

  // 获取30天后的日期作为最大可选日期
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 365 * 5);
  const maxDateString = maxDate.toISOString().split("T")[0];

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
    <div className="container mx-auto py-6 px-4 sm:px-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-pink-600 mb-2">
          用户预约
        </h1>
        <p className="text-gray-500">搜索用户，并为用户创建美甲预约</p>
      </div>

      {/* 搜索区域 */}
      <Card className="mb-8 shadow-md border-pink-100 bg-white">
        <CardHeader>
          <CardTitle className="text-pink-600">搜索用户</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="输入用户名、邮箱或昵称"
                className="flex-1 bg-white/80 py-5 sm:py-6 px-4 pl-10 border-pink-200 focus:border-pink-400 focus:ring-pink-400 rounded-xl"
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
                className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-400"
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
            <div className="flex gap-2">
              <Button
                className="flex-1 sm:flex-none bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white py-2 px-4 sm:px-8 rounded-xl shadow-md transition-all duration-200 flex items-center justify-center h-10 sm:h-12"
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
                      className="h-4 w-4 mr-1 sm:h-5 sm:w-5 sm:mr-2"
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
          </div>
        </CardContent>
      </Card>

      {/* 结果区域固定高度容器 - 增加最小高度，确保各状态下高度一致 */}
      <div className="min-h-[400px] flex flex-col justify-center">
        {/* 搜索中显示加载状态 */}
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-pink-600">正在搜索用户...</p>
          </div>
        )}

        {/* 未搜索时显示提示文本 */}
        {!hasSearched && !isSearching && (
          <div className="text-center py-12 text-gray-400">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-gray-400"
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
            <p>请输入关键词开始搜索用户</p>
          </div>
        )}

        {/* 搜索结果为空时显示提示 */}
        {hasSearched && !isSearching && searchResults.length === 0 && (
          <Card className="shadow-md border-pink-100 bg-white">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-pink-500"
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
                <h3 className="text-lg font-medium text-pink-600 mb-2">
                  没有找到匹配的用户
                </h3>
                <p className="text-gray-500 max-w-md">
                  尝试使用不同的关键词，或者检查用户是否已经注册
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 搜索结果 - 只有有结果时才显示 */}
        {hasSearched && !isSearching && searchResults.length > 0 && (
          <div className="relative">
            {/* 上一页按钮 - 左侧 */}
            {totalPages > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 h-9 w-9 p-0 rounded-full border-pink-200 bg-white/80 shadow-md -ml-4"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-pink-600"
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
                <span className="sr-only">上一页</span>
              </Button>
            )}

            <Card className="shadow-md border-pink-100 bg-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-1.5 h-5 sm:h-6 bg-gradient-to-b from-pink-500 to-purple-500 rounded-full mr-2"></div>
                    <CardTitle className="text-pink-600">搜索结果</CardTitle>
                    <span className="ml-2 text-xs sm:text-sm bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
                      {searchResults.length}位用户
                    </span>
                  </div>
                  {selectedUser && (
                    <Dialog
                      open={showReservationForm}
                      onOpenChange={setShowReservationForm}
                    >
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white">
                          创建预约
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="sm:max-w-md bg-white">
                        <DialogHeader>
                          <DialogTitle className="text-pink-600">
                            创建预约
                          </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-5 w-5 text-pink-500"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                              <div>
                                <div className="text-sm font-medium">
                                  {selectedUser.name ||
                                    selectedUser.username ||
                                    "匿名用户"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {selectedUser.email || "无邮箱"}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              选择美甲师
                            </label>
                            <Select
                              value={selectedNailArtist}
                              onValueChange={setSelectedNailArtist}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="选择美甲师" />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                {nailArtists.map((artist) => (
                                  <SelectItem key={artist.id} value={artist.id}>
                                    {artist.name} ({artist.role})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              选择日期
                            </label>
                            <Input
                              type="date"
                              min={today}
                              max={maxDateString}
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              选择时间段
                            </label>
                            <Select
                              value={selectedTimeSlot}
                              onValueChange={setSelectedTimeSlot}
                              disabled={
                                isLoadingTimeSlots ||
                                availableTimeSlots.length === 0
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue
                                  placeholder={
                                    isLoadingTimeSlots
                                      ? "加载中..."
                                      : availableTimeSlots.length === 0
                                      ? "请先选择日期和美甲师"
                                      : "选择时间段"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                {availableTimeSlots.map((slot) => (
                                  <SelectItem key={slot} value={slot}>
                                    {slot}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <DialogFooter>
                          <DialogClose asChild>
                            <Button
                              variant="outline"
                              className="border-pink-200 text-pink-600"
                            >
                              取消
                            </Button>
                          </DialogClose>
                          <Button
                            onClick={handleSubmitReservation}
                            className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
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
                                提交中...
                              </span>
                            ) : (
                              "创建预约"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentItems.map((user) => (
                    <div
                      key={user.id}
                      className={`border p-4 rounded-lg transition-all cursor-pointer hover:shadow-md ${
                        selectedUser && selectedUser.id === user.id
                          ? "border-pink-400 bg-pink-50"
                          : "border-gray-200"
                      }`}
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="flex items-start md:items-center flex-col md:flex-row gap-3">
                        <div className="flex-1">
                          <div className="font-medium wrap-anywhere text-pink-700">
                            {user.name || user.username || "匿名用户"}
                          </div>

                          <div className="mt-2">
                            <div className="text-xs text-gray-500 font-medium mb-1">
                              主要联系方式
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {renderContactIcon(user.contactType)}
                              <div className="text-sm truncate max-w-[200px]">
                                {user.email || "无"}
                              </div>
                            </div>
                          </div>

                          <div className="mt-2">
                            <div className="text-xs text-gray-500 font-medium mb-1">
                              备选联系方式
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {renderContactIcon(user.altContactType)}
                              <div className="text-sm truncate max-w-[200px]">
                                {user.altContact || "无"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="self-start mt-1 md:self-center md:mt-0">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                            <FaUser className="h-3 w-3 mr-1" />
                            {user.provider || "未知来源"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 页码指示器 - 居中显示 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center mt-6">
                    {(() => {
                      // 显示当前页附近的页码和首尾页码
                      const pageNumbers = [];
                      // 移动端显示更少的按钮
                      const maxPageButtons = window.innerWidth < 640 ? 3 : 5;

                      // 总是添加第一页
                      pageNumbers.push(1);

                      // 计算显示的页码范围 - 移动端可能只显示当前页
                      const isMobile = window.innerWidth < 640;
                      let startPage = isMobile
                        ? currentPage
                        : Math.max(2, currentPage - 1);
                      let endPage = isMobile
                        ? currentPage
                        : Math.min(totalPages - 1, currentPage + 1);

                      // 确保不会显示太多按钮
                      if (endPage - startPage + 3 > maxPageButtons) {
                        if (currentPage < totalPages / 2) {
                          endPage = startPage + (isMobile ? 0 : 1);
                        } else {
                          startPage = endPage - (isMobile ? 0 : 1);
                        }
                      }

                      // 只有当当前页不是第一页时才添加省略号
                      if (startPage > 2 && currentPage > 2) {
                        pageNumbers.push("ellipsis-start");
                      }

                      // 添加中间页码
                      for (let i = startPage; i <= endPage; i++) {
                        if (i > 1 && i < totalPages) {
                          pageNumbers.push(i);
                        }
                      }

                      // 只有当当前页不是最后页时才添加后省略号
                      if (
                        endPage < totalPages - 1 &&
                        currentPage < totalPages - 1
                      ) {
                        pageNumbers.push("ellipsis-end");
                      }

                      // 总是添加最后一页（如果最后一页不是第一页）
                      if (totalPages > 1) {
                        pageNumbers.push(totalPages);
                      }

                      // 去重
                      const uniquePageNumbers = [...new Set(pageNumbers)];

                      // 渲染页码按钮
                      return uniquePageNumbers.map((page, index) => {
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
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => handlePageChange(page as number)}
                            className={`h-7 w-7 p-0 text-xs mx-0.5 sm:h-8 sm:w-8 sm:text-sm sm:mx-1 ${
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
                )}
              </CardContent>
            </Card>

            {/* 下一页按钮 - 右侧 */}
            {totalPages > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 h-9 w-9 p-0 rounded-full border-pink-200 bg-white/80 shadow-md -mr-4"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-pink-600"
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
                <span className="sr-only">下一页</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
