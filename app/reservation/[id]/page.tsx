"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BsWechat } from "react-icons/bs";
import { PiPhoneFill } from "react-icons/pi";
import { MdEmail } from "react-icons/md";
import { RiKakaoTalkFill } from "react-icons/ri";
import { BiLogoInstagramAlt } from "react-icons/bi";
import { LuPenOff } from "react-icons/lu";
import { FaUserNurse } from "react-icons/fa";
// 定义预约数据类型
type ReservationData = {
	user: string;
	timeslot: string;
	contact: string;
	reservationId: string;
	date: string;
	provider: string;
	contactType: string;
	nailArtist?: string;
};

// 定义用户数据类型
type UserData = {
	id: string;
	name: string;
	account: string;
	memberType: string;
};

export default function ReservationDetail() {
	const params = useParams();
	const router = useRouter();
	const reservationId = params.id as string;
	const [reservation, setReservation] =
		useState<ReservationData | null>(null);
	const [loading, setLoading] = useState(true);
	const [openDialog, setOpenDialog] = useState(false);
	const [currentUser, setCurrentUser] = useState<UserData | null>(null);

	// 获取当前登录用户信息
	useEffect(() => {
		const token = localStorage.getItem('accessToken');
		if (!token) {
			router.push('/');
			return;
		}

		try {
			// 从JWT中解析用户信息
			const tokenParts = token.split('.');
			if (tokenParts.length === 3) {
				const payload = JSON.parse(atob(tokenParts[1]));
				setCurrentUser({
					id: payload.id || '',
					name: payload.name || payload.username || '',
					account: payload.username || '',
					memberType: payload.memberType || '',
				});
			}
		} catch (error) {
			console.error("解析token失败:", error);
			router.push('/');
		}
	}, []);

	useEffect(() => {
		const fetchReservation = async () => {
			setLoading(true);

			try {
				const res = await fetch(
					`/api/getSingleReservation?reservationid=${reservationId}`
				);
				if (!res.ok) {
					throw new Error("Failed to fetch reservation");
				}

				const data = await res.json();
				console.log("预约数据:", data);

				const formattedData: ReservationData = {
					user: data.name,
					timeslot: data.timeSlot,
					contact: data.email ?? "",
					reservationId: data.reservationId,
					date: data.date.split("T")[0],
					provider: data.provider ?? "credentials",
					contactType: data.contactType ?? "email",
					nailArtist: data.nailArtistName || ""
				};

				setReservation(formattedData);
			} catch (error) {
				console.error(error);
				setReservation(null);
			} finally {
				setLoading(false);
			}
		};

		if (reservationId) {
			fetchReservation();
		}
	}, [reservationId]);

	// 获取provider对应的标签样式
	const getProviderBadgeStyle = (provider: string): string => {
		switch (provider) {
			case "wechat":
				return "bg-green-500 text-white";
			case "google":
				return "bg-blue-500 text-white";
			case "kakao":
				return "bg-yellow-500 text-white";
			case "credentials":
			default:
				return "bg-pink-500 text-white";
		}
	};

	// 获取provider的中文说明
	const getProviderName = (provider: string): string => {
		switch (provider) {
			case "wechat":
				return "微信";
			case "google":
				return "谷歌";
			case "kakao":
				return "Kakao";
			case "credentials":
			default:
				return "账号密码";
		}
	};

	const getContactType = (contactType: string): React.ReactNode => {
		switch (contactType) {
			case "wechat":
				return <BsWechat className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center text-white p-2" size={30} />;
			case "phone":
				return <PiPhoneFill className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white p-2" size={30} />
			case "email":
				return <MdEmail className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white p-2" size={30} />
			case "Instagram":
				return <BiLogoInstagramAlt className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white p-2" size={30} />
			case "kakao":
				return <RiKakaoTalkFill className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-white p-2" size={30} />
			default:
				return <LuPenOff className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white p-2" size={30} />;
		}
	}

	const handleDelete = async () => {
		try {
			if (!currentUser) {
				toast.error("您需要登录才能取消预约", {
					position: "top-center",
					duration: 3000,
				});
				router.push('/');
				return;
			}

			const res = await fetch(
				`/api/getSingleReservation?reservationid=${reservationId}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						operatorName: currentUser.name,
						operatorAccount: currentUser.account,
						operatorType: currentUser.memberType
					}),
				}
			);

			if (!res.ok) {
				throw new Error("删除失败");
			}

			const data = await res.json();

			if (data.success) {
				// 成功后跳回首页或日历页
				toast.success(`成功取消预约`, {
					position: "top-center",
					duration: 3000,
				});
				router.push("/calendar");
			} else {
				toast.error(`删除失败: ${data.message || "未知错误"}`, {
					position: "top-center",
					duration: 3000,
				});
				setTimeout(() => {
					window.location.reload();
				}, 3000);
			}
		} catch (error) {
			console.error(error);
			toast.error(`删除失败，请待会重试`, {
				position: "top-center",
				duration: 3000,
			});
			// reload the page
			setTimeout(() => {
				window.location.reload();
			}, 3000);
		}
	};

	// 如果没有用户信息，显示加载中
	if (!currentUser) {
		return <div className="container mx-auto p-4 max-w-2xl bg-gradient-to-b from-pink-50 to-purple-50 min-h-screen flex justify-center items-center">
			<div className="animate-pulse flex space-x-2">
				<div className="h-3 w-3 bg-pink-400 rounded-full"></div>
				<div className="h-3 w-3 bg-pink-500 rounded-full"></div>
				<div className="h-3 w-3 bg-pink-600 rounded-full"></div>
			</div>
		</div>;
	}

	return (
		<div className="container mx-auto p-4 max-w-2xl bg-gradient-to-b from-pink-50 to-purple-50 min-h-screen">
			<h1 className="mt-30 text-3xl font-bold mb-8 text-center text-pink-600 tracking-wide">预约详情</h1>

			{loading ? (
				<div className="flex justify-center items-center h-40">
					<div className="animate-pulse flex space-x-2">
						<div className="h-3 w-3 bg-pink-400 rounded-full"></div>
						<div className="h-3 w-3 bg-pink-500 rounded-full"></div>
						<div className="h-3 w-3 bg-pink-600 rounded-full"></div>
					</div>
				</div>
			) : reservation ? (
				<div className="bg-white shadow-lg rounded-2xl p-6 border-4 border-pink-200 backdrop-blur-sm">
					<div className="grid grid-cols-1 gap-6">
						<div className="border-b-2 border-dotted border-pink-200 pb-4">
							<div className="flex items-center mb-2">
								<div className="w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center mr-3">
									<span className="text-white text-sm">ID</span>
								</div>
								<h2 className="text-lg font-bold text-gray-700">预约ID</h2>
							</div>
							<p className="text-gray-600 pl-11 font-mono text-sm">{reservation.reservationId}</p>
						</div>

						<div className="border-b-2 border-dotted border-pink-200 pb-4">
							<div className="flex items-center mb-2">
								<div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center mr-3">
									<span className="text-white text-sm">👤</span>
								</div>
								<h2 className="text-lg font-bold text-gray-700">客户姓名</h2>
							</div>
							<p className="text-gray-600 pl-11 font-medium">{reservation.user ? reservation.user : "未设置"}</p>
						</div>

						<div className="border-b-2 border-dotted border-pink-200 pb-4">
							<div className="flex items-center mb-3">
								<div className="w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center mr-3">
									<span className="text-white text-sm">🕒</span>
								</div>
								<h2 className="text-lg font-bold text-gray-700">预约时间</h2>
							</div>
							<div className="pl-11">
								<span className="bg-gradient-to-r from-pink-200 to-pink-100 px-3 py-1.5 rounded-full mr-3 inline-block font-medium shadow-sm">{reservation.date}</span>
								<span className="bg-gradient-to-r from-blue-200 to-blue-100 px-3 py-1.5 rounded-full inline-block font-medium shadow-sm">{reservation.timeslot}</span>
							</div>
						</div>

						<div className="border-b-2 border-dotted border-pink-200 pb-4">
							<div className="flex items-center mb-2 gap-3">
								<div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center ">
									<div className="">{getContactType(reservation.contactType)}</div>
								</div>
								<h2 className="text-lg font-bold text-gray-700">联系方式</h2>
							</div>
							<p className="text-gray-600 pl-11 font-medium">
								{reservation.contact ? reservation.contact : "未设置"}
							</p>
						</div>

						{reservation.nailArtist && (
							<div className="border-b-2 border-dotted border-pink-200 pb-4">
								<div className="flex items-center mb-2">
									<div className="w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center mr-3">
										<FaUserNurse className="text-white" size={16} />
									</div>
									<h2 className="text-lg font-bold text-gray-700">美甲师</h2>
								</div>
								<p className="text-gray-600 pl-11 font-medium">
									{reservation.nailArtist || "未分配"}
								</p>
							</div>
						)}

						<div className="pb-2">
							<div className="flex items-center mb-2">
								<div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center mr-3">
									<span className="text-white text-sm">🔑</span>
								</div>
								<h2 className="text-lg font-bold text-gray-700">登录方式</h2>
							</div>
							<div className="mt-1 pl-11">
								<span className={`px-4 py-1.5 rounded-full text-sm ${getProviderBadgeStyle(reservation.provider)} shadow-sm font-medium`}>
									{getProviderName(reservation.provider)}
								</span>
							</div>
						</div>
					</div>

					<div className="mt-8 flex gap-4 justify-center">
						<Button className="bg-gradient-to-r from-purple-500 to-pink-600 active:from-purple-600 active:to-pink-700 text-white px-6 py-2 rounded-full shadow-md transition-all duration-300 transform active:scale-105">
							<Link href="/calendar" className="">
								返回日历
							</Link>
						</Button>

						<Button
							className="bg-gradient-to-r from-red-500 to-red-600 active:from-red-600 active:to-red-700 text-white px-6 py-2 rounded-full shadow-md transition-all duration-300 transform active:scale-105"
							onClick={() => setOpenDialog(true)}
						>
							取消预约
						</Button>
					</div>
				</div>
			) : (
				<div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg shadow-md">
					<p className="text-yellow-700 font-medium">未找到预约信息</p>
				</div>
			)}

			{/* 取消预约确认弹窗 */}
			<Dialog open={openDialog} onOpenChange={setOpenDialog}>
				<DialogContent className="bg-white rounded-2xl border-4 border-pink-200 p-0 overflow-hidden">
					<div className="bg-gradient-to-r from-pink-400 to-purple-400 py-4 px-6">
						<DialogTitle className="text-white font-bold text-xl">确认取消预约？</DialogTitle>
					</div>
					<div className="p-6">
						<p className="text-gray-600 mb-6">
							取消后将无法恢复，确定要取消这条预约吗？
						</p>
						<DialogFooter className="flex gap-3 justify-end">
							<Button
								variant="outline"
								onClick={() => setOpenDialog(false)}
								className="border-pink-300 text-pink-500 hover:bg-pink-50"
							>
								返回
							</Button>
							<Button
								variant="destructive"
								className="bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 border-none"
								onClick={handleDelete}
							>
								确认取消
							</Button>
						</DialogFooter>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
