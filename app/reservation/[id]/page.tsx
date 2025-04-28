"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
// 定义预约数据类型
type ReservationData = {
	user: string;
	timeslot: string;
	contact: string;
	reservationId: string;
	date: string;
	provider: string;
};

export default function ReservationDetail() {
	const params = useParams();
	const router = useRouter();
	const reservationId = params.id as string;
	const [reservation, setReservation] =
		useState<ReservationData | null>(null);
	const [loading, setLoading] = useState(true);
	const [openDialog, setOpenDialog] = useState(false);

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

				const formattedData: ReservationData = {
					user: data.name,
					timeslot: data.timeSlot,
					contact: data.email ?? "",
					reservationId: data.reservationId,
					date: data.date.split("T")[0],
					provider: data.provider ?? "credentials",
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

	const handleDelete = async () => {
		try {
			const res = await fetch(
				`/api/getSingleReservation?reservationid=${reservationId}`,
				{
					method: "POST",
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
				router.push("/");
			} else {
				toast.error(`删除失败`, {
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
							<div className="flex items-center mb-2">
								<div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center mr-3">
									<span className="text-white text-sm">✉️</span>
								</div>
								<h2 className="text-lg font-bold text-gray-700">联系方式</h2>
							</div>
							<p className="text-gray-600 pl-11 font-medium">
								{reservation.contact ? reservation.contact : "未设置"}
							</p>
						</div>

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
