"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// 美甲师类型定义
type NailArtist = {
  id: string;
  name: string;
  role: string;
  account: string;
};

// 角色名称和颜色映射
const roleNameMap: Record<string, { label: string; color: string }> = {
  L1: { label: "院长", color: "bg-pink-200 text-pink-700" },
  L2: { label: "大师", color: "bg-fuchsia-200 text-fuchsia-700" },
  L3: { label: "员工", color: "bg-purple-100 text-purple-700" },
  L4: { label: "实习", color: "bg-blue-100 text-blue-700" },
  L5: { label: "助理", color: "bg-green-100 text-green-700" },
  L6: { label: "学徒", color: "bg-yellow-100 text-yellow-700" },
};

// 获取所有美甲师数据的API函数
const fetchNailArtists = async (): Promise<NailArtist[]> => {
  try {
    const token = localStorage.getItem("accessToken");
    const response = await fetch("/api/nailArtists", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error("获取美甲师数据失败");
    }

    const data = await response.json();
    return data.nailArtists || [];
  } catch (error) {
    console.error("获取美甲师数据错误:", error);
    toast.error("获取美甲师数据失败，请重试");
    return [];
  }
};

// 删除美甲师的API函数
const deleteNailArtist = async (id: string): Promise<boolean> => {
  try {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`/api/nailArtists/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "删除美甲师失败");
    }

    return true;
  } catch (error) {
    console.error("删除美甲师错误:", error);
    toast.error(
      error instanceof Error ? error.message : "删除美甲师失败，请重试"
    );
    return false;
  }
};

export default function DeleteNailArtistPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    memberType: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [nailArtists, setNailArtists] = useState<NailArtist[]>([]);
  const [filteredArtists, setFilteredArtists] = useState<NailArtist[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<NailArtist | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 获取用户信息
  useEffect(() => {
    setIsLoading(true);
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/");
    } else {
      // 解析JWT获取用户信息
      try {
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
        setIsLoading(false);
      }
    }
  }, [router]);

  // 添加新的 useEffect 来监听 currentUser 变化
  useEffect(() => {
    if (currentUser) {
      // 检查用户权限，如果不是 manager 则返回首页
      if (currentUser.memberType !== "manager") {
        toast.error("只有经理才能访问此页面");
        router.push("/");
      } else {
        // 经理身份验证通过，结束加载状态
        setIsLoading(false);
        // 加载美甲师数据
        loadNailArtistsData();
      }
    }
  }, [currentUser, router]);

  // 加载美甲师数据
  const loadNailArtistsData = async () => {
    setIsDataLoading(true);
    try {
      // 调用API获取数据
      const data = await fetchNailArtists();
      setNailArtists(data);

      // 不再使用模拟数据
      // setNailArtists(mockNailArtists);
    } catch (error) {
      console.error("加载美甲师数据失败:", error);
    } finally {
      setIsDataLoading(false);
    }
  };

  // 执行搜索
  const handleSearch = () => {
    setHasSearched(true);
    setSelectedArtist(null);

    if (searchQuery.trim() === "") {
      setFilteredArtists([]);
      return;
    }

    const filtered = nailArtists.filter(
      (artist) =>
        artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.account.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredArtists(filtered);
  };

  // 选择或取消选择美甲师
  const handleSelectArtist = (artist: NailArtist) => {
    // 如果点击的是已经选中的美甲师，则取消选择
    if (selectedArtist && selectedArtist.id === artist.id) {
      setSelectedArtist(null);
    } else {
      // 选择新的美甲师
      setSelectedArtist(artist);
    }
  };

  // 删除确认
  const handleConfirmDelete = async () => {
    if (selectedArtist) {
      setIsDeleting(true);
      try {
        // 调用删除API
        const success = await deleteNailArtist(selectedArtist.id);

        // 不再使用模拟删除
        // const success = true;

        if (success) {
          // 更新本地状态
          const updatedArtists = nailArtists.filter(
            (artist) => artist.id !== selectedArtist.id
          );
          setNailArtists(updatedArtists);
          setSelectedArtist(null);
          setShowConfirmDialog(false);
          setFilteredArtists([]);
          setSearchQuery("");
          setHasSearched(false);
          toast.success(`已成功删除美甲师 ${selectedArtist.name}`);
        }
      } catch (error) {
        console.error("删除美甲师失败:", error);
        toast.error("删除美甲师失败，请重试");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // 重置搜索
  const handleReset = () => {
    setSearchQuery("");
    setFilteredArtists([]);
    setSelectedArtist(null);
    setHasSearched(false);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-pink-100 via-purple-50 to-pink-100 flex flex-col items-center justify-center px-4">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-pink-600 text-lg font-medium">
            正在验证访问权限...
          </p>
        </div>
      ) : (
        <div className="w-full max-w-4xl bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden shadow-xl border border-pink-200 p-4 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 mb-4 sm:mb-6 text-center">
            美甲师管理
          </h1>

          {isDataLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-pink-600">正在加载美甲师数据...</p>
            </div>
          ) : (
            <>
              {/* 搜索区域 */}
              <div className="mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Input
                      placeholder="输入美甲师姓名、账号或等级"
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
                    >
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
                    </Button>
                    {hasSearched && (
                      <Button
                        className="flex-1 sm:flex-none bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 sm:px-8 rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center h-10 sm:h-12"
                        onClick={handleReset}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1 sm:h-5 sm:w-5 sm:mr-2"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                            clipRule="evenodd"
                          />
                        </svg>
                        重置
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* 搜索结果区域 */}
              {hasSearched && (
                <div className="mb-6 sm:mb-8">
                  {filteredArtists.length > 0 ? (
                    <>
                      <div className="flex items-center mb-3 sm:mb-4">
                        <div className="w-1.5 h-5 sm:h-6 bg-gradient-to-b from-pink-500 to-purple-500 rounded-full mr-2"></div>
                        <h2 className="text-lg sm:text-xl font-semibold text-pink-600">
                          搜索结果
                        </h2>
                        <span className="ml-2 text-xs sm:text-sm bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
                          {filteredArtists.length}位美甲师
                        </span>
                      </div>
                      <div className="space-y-3">
                        {filteredArtists.map((artist) => (
                          <Card
                            key={artist.id}
                            className={`cursor-pointer transition-all duration-300 hover:shadow-md hover:translate-y-[-2px] ${
                              selectedArtist?.id === artist.id
                                ? "border-2 border-pink-500 bg-gradient-to-r from-pink-50 to-purple-50 shadow-md"
                                : "border border-pink-100 hover:border-pink-200"
                            }`}
                            onClick={() => handleSelectArtist(artist)}
                          >
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between">
                                <div className="flex items-center w-full sm:w-auto">
                                  <div
                                    className={`relative shrink-0 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mr-3 sm:mr-4 ${
                                      selectedArtist?.id === artist.id
                                        ? "bg-gradient-to-br from-pink-400 to-purple-400 text-white"
                                        : roleNameMap[artist.role]?.color ||
                                          "bg-pink-100 text-pink-600"
                                    }`}
                                  >
                                    <span className="font-semibold text-sm sm:text-base">
                                      {roleNameMap[artist.role]?.label ||
                                        artist.role}
                                    </span>
                                    {selectedArtist?.id === artist.id && (
                                      <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-2.5 w-2.5 sm:h-3 sm:w-3"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                        >
                                          <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h3 className="font-bold text-base sm:text-lg text-pink-600 mb-0.5 truncate">
                                      {artist.name}
                                    </h3>
                                    <div className="flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm">
                                      <div className="flex items-center">
                                        <span className="text-gray-500">
                                          账号:{" "}
                                        </span>
                                        <span className="text-gray-700 ml-1 truncate max-w-[120px]">
                                          {artist.account}
                                        </span>
                                      </div>
                                      <span className="hidden sm:inline mx-2 text-gray-300">
                                        |
                                      </span>
                                      <div className="flex items-center">
                                        <span className="text-gray-500">
                                          等级:{" "}
                                        </span>
                                        <span
                                          className={`font-medium ml-1 ${
                                            roleNameMap[
                                              artist.role
                                            ]?.color.split(" ")[1] ||
                                            "text-pink-500"
                                          }`}
                                        >
                                          {roleNameMap[artist.role]?.label ||
                                            artist.role}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {selectedArtist?.id === artist.id && (
                                  <div className="flex mt-2 sm:mt-0 ml-auto sm:ml-0">
                                    <button
                                      className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors duration-200 rounded-full p-1.5 sm:p-2 focus:outline-none mr-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectArtist(artist);
                                      }}
                                      aria-label="取消选择"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 sm:h-5 sm:w-5"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </button>
                                    <button
                                      className="text-white bg-red-500 hover:bg-red-600 transition-colors duration-200 rounded-full p-1.5 sm:p-2 focus:outline-none"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowConfirmDialog(true);
                                      }}
                                      aria-label="删除美甲师"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 sm:h-5 sm:w-5"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg border border-gray-100">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <p className="text-gray-500 mb-2">未找到匹配的美甲师</p>
                      <p className="text-xs sm:text-sm text-gray-400">
                        请尝试其他搜索关键词
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 选中的美甲师和删除按钮区域 - 现在集成到了搜索结果的卡片里 */}
              {selectedArtist && !hasSearched && (
                <div className="text-center mt-4 sm:mt-6">
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
                    <h3 className="text-lg sm:text-xl font-bold text-pink-600 mb-3 sm:mb-4">
                      已选择美甲师
                    </h3>
                    <div className="flex flex-col sm:flex-row items-center justify-between bg-white rounded-lg p-4 sm:p-5 shadow-sm">
                      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-0">
                        <div
                          className={`bg-gradient-to-br from-pink-400 to-purple-400 text-white rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center ${
                            selectedArtist
                              ? roleNameMap[selectedArtist.role]?.color ||
                                "bg-pink-100 text-pink-600"
                              : ""
                          }`}
                        >
                          <span className="font-semibold text-base sm:text-lg">
                            {selectedArtist
                              ? roleNameMap[selectedArtist.role]?.label ||
                                selectedArtist.role
                              : ""}
                          </span>
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-lg sm:text-xl text-pink-600">
                            {selectedArtist.name}
                          </h4>
                          <p className="text-sm sm:text-base text-gray-600">
                            账号: {selectedArtist.account}
                          </p>
                        </div>
                      </div>
                      <Button
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-2 px-4 sm:px-6 rounded-full shadow-md transition-all duration-200 flex items-center w-full sm:w-auto justify-center"
                        onClick={() => setShowConfirmDialog(true)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        删除此美甲师
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 确认删除对话框 */}
          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogContent className="bg-white p-0 rounded-2xl max-w-md mx-auto overflow-hidden w-[95%] sm:w-auto">
              <div className="bg-red-500 text-white p-4 sm:p-5">
                <DialogTitle className="text-lg sm:text-xl font-bold flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 sm:h-6 sm:w-6 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  确认删除
                </DialogTitle>
              </div>
              <div className="p-4 sm:p-6">
                <DialogDescription className="text-gray-600 mt-2 mb-4 sm:mb-6 text-sm sm:text-base">
                  您确定要删除美甲师{" "}
                  <span className="font-bold text-pink-600">
                    {selectedArtist?.name}
                  </span>{" "}
                  吗？此操作不可撤销。
                </DialogDescription>
                <DialogFooter className="flex justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
                  <Button
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm sm:text-base py-1.5 sm:py-2 px-3 sm:px-4"
                    onClick={() => setShowConfirmDialog(false)}
                    disabled={isDeleting}
                  >
                    取消
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm sm:text-base py-1.5 sm:py-2 px-3 sm:px-4"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1 sm:mr-2"></div>
                        处理中...
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-1.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        确认删除
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
