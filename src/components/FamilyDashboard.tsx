import React, { useState, useEffect } from "react";
import { FamilyGroup, UserProfile } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, arrayUnion, onSnapshot, getDoc } from "firebase/firestore";
import { Users, Plus, Key, CheckCircle, AlertCircle, Share2, Compass, Award } from "lucide-react";

interface FamilyDashboardProps {
  userId: string;
  userProfile: UserProfile | null;
}

export default function FamilyDashboard({ userId, userProfile }: FamilyDashboardProps) {
  const [group, setGroup] = useState<FamilyGroup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Group creation inputs
  const [groupNameInput, setGroupNameInput] = useState("");
  // Group joining inputs
  const [inviteCodeInput, setInviteCodeInput] = useState("");

  // Detailed group member rankings
  const [memberProfiles, setMemberProfiles] = useState<{ name: string; footprint: number }[]>([]);

  // Unique Code Generator helper
  const generateInviteCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  useEffect(() => {
    if (!userId || !userProfile?.familyGroupId) {
      setGroup(null);
      setMemberProfiles([]);
      return;
    }

    setLoading(true);
    const path = `family_groups/${userProfile.familyGroupId}`;
    
    // Real-time listener for user's household group document
    const unsubscribe = onSnapshot(
      doc(db, "family_groups", userProfile.familyGroupId),
      async (docSnap) => {
        if (docSnap.exists()) {
          const gData = docSnap.data() as FamilyGroup;
          setGroup(gData);

          // Get detailed profiles for all members in the group to display rankings in parallel
          try {
            const memberPromises = gData.memberIds.map((mId) => getDoc(doc(db, "users", mId)));
            const snaps = await Promise.all(memberPromises);
            const profilesList = snaps
              .filter((uSnap) => uSnap.exists())
              .map((uSnap) => {
                const uData = uSnap.data() as UserProfile;
                return {
                  name: uData.displayName || "Echo Partner",
                  footprint: uData.currentFootprint,
                };
              });

            // Sort memberships by lowest footprint first (best eco standing!)
            profilesList.sort((a, b) => a.footprint - b.footprint);
            setMemberProfiles(profilesList);
          } catch (err) {
            console.warn("Failed to fetch member details in parallel:", err);
          }
        } else {
          setGroup(null);
        }
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, userProfile?.familyGroupId]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const groupId = "group_" + Date.now();
    const code = generateInviteCode();

    const newGroup: FamilyGroup = {
      groupId,
      name: groupNameInput.trim(),
      ownerId: userId,
      memberIds: [userId],
      inviteCode: code,
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Create the family_groups document
      await setDoc(doc(db, "family_groups", groupId), newGroup);

      // 2. Link User Profile familyGroupId
      await updateDoc(doc(db, "users", userId), {
        familyGroupId: groupId,
      });

      setGroupNameInput("");
      setSuccess("Household squad created! Copy invite code below to invite others.");
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `family_groups/${groupId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Look up group collection matches
      const q = query(collection(db, "family_groups"), where("inviteCode", "==", inviteCodeInput.trim().toUpperCase()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("Invalid invite code. Try double-checking with household manager.");
        setLoading(false);
        return;
      }

      const matchDoc = snap.docs[0];
      const matchGroup = matchDoc.data() as FamilyGroup;

      if (matchGroup.memberIds.includes(userId)) {
        setError("You are already registered as a member inside this household group.");
        setLoading(false);
        return;
      }

      // Add UID to group's registered members array
      await updateDoc(doc(db, "family_groups", matchGroup.groupId), {
        memberIds: arrayUnion(userId),
      });

      // Update User profile family link
      await updateDoc(doc(db, "users", userId), {
        familyGroupId: matchGroup.groupId,
      });

      setInviteCodeInput("");
      setSuccess(`Joined "${matchGroup.name}" group successfully!`);
    } catch (err: any) {
      setError(err.message || "Failed to sync and register join actions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="family_dashboard_panel" className="bg-bg-card rounded-[32px] p-6 shadow-sm border border-border-brand space-y-6 theme-transition">
      
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-brand-secondary text-brand-dark rounded-2xl">
          <Users className="w-6 h-6 text-brand-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            Family Carbon Dashboard
          </h2>
          <p className="text-xs text-text-secondary">
            Join households side-by-side to track collaborative objectives or compare ecological leaderboards!
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-brand-secondary text-brand-dark rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" stroke="currentColor" />
          <span>{success}</span>
        </div>
      )}

      {group ? (
        // Active Family Dashboard Screen
        <div className="space-y-6">
          <div className="p-5 bg-brand-secondary/30 rounded-[28px] border border-border-brand flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-2xs font-bold text-brand-primary uppercase tracking-widest block mb-1">
                Active Household
              </span>
              <h3 className="text-lg font-bold text-text-primary">
                {group.name}
              </h3>
            </div>

            <div className="bg-bg-card p-3 rounded-2xl border border-border-brand flex items-center gap-4 theme-transition">
              <div>
                <span className="text-3xs text-text-secondary uppercase block font-bold">
                  Shared Invite Code
                </span>
                <span className="text-sm font-mono font-bold tracking-wider text-text-primary">
                  {group.inviteCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(group.inviteCode);
                  setSuccess("Invite code copied! Invite family members to compete.");
                  setTimeout(() => setSuccess(null), 3000);
                }}
                className="p-2 text-brand-primary bg-brand-secondary rounded-xl border border-border-brand hover:bg-brand-secondary/80 transition-all shrink-0 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Member Rankings Leaderboard */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-text-primary">
              Household Leaderboard: Lowest annual carbon (Metric Tons)
            </h4>

            <div className="space-y-2">
              {memberProfiles.map((member, idx) => (
                <div
                  key={idx}
                  className="bg-brand-bg p-4 rounded-2xl border border-border-brand flex items-center justify-between shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-secondary text-brand-primary flex items-center justify-center font-bold text-xs shadow-inner">
                      {idx + 1}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-text-primary block">
                        {member.name}
                      </span>
                      {idx === 0 && (
                        <span className="text-3xs font-extrabold tracking-widest uppercase text-brand-primary flex items-center gap-0.5 mt-0.5 animate-pulse">
                          <Award className="w-3 h-3 text-brand-teal" /> Green Champion
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-sm font-extrabold text-text-primary block">
                      {member.footprint.toFixed(1)} t/yr
                    </span>
                    <span className="text-3xs text-text-secondary font-medium">
                      estimated CO₂e emissions
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Create or Join a household screen
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Box 1: Create Group */}
          <div className="p-5 border border-dashed border-border-brand rounded-[28px] space-y-4 bg-bg-card theme-transition">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand-primary" />
              Establish a new household Group
            </h3>
            <p className="text-2xs text-text-secondary leading-relaxed">
              Create a group workspace for your home or agency. Invite partners or housemates to benchmark shared goals.
            </p>

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <input
                id="group_name_input"
                type="text"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                placeholder="e.g. Borana Residence, Apt 4B, etc."
                className="w-full bg-brand-bg border border-border-brand rounded-2xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-brand-primary text-text-primary"
              />
              <button
                id="create_household_btn"
                type="submit"
                disabled={loading || !groupNameInput.trim()}
                className="w-full py-2 bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-40 text-white rounded-2xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                Create Group
              </button>
            </form>
          </div>

          {/* Box 2: Join Group */}
          <div className="p-5 border border-dashed border-border-brand rounded-[28px] space-y-4 bg-bg-card theme-transition">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Key className="w-4 h-4 text-brand-primary" />
              Join an existing household
            </h3>
            <p className="text-2xs text-text-secondary leading-relaxed">
              Type the unique 6-character shared invite code provided by your household manager to register membership.
            </p>

            <form onSubmit={handleJoinGroup} className="space-y-3">
              <input
                id="invite_code_input"
                type="text"
                maxLength={6}
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="e.g. AX8R2Q"
                className="w-full bg-brand-bg border border-border-brand rounded-2xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-brand-primary text-text-primary font-mono tracking-widest text-center"
              />
              <button
                id="join_household_btn"
                type="submit"
                disabled={loading || !inviteCodeInput.trim()}
                className="w-full py-2 bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-40 text-white rounded-2xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                Join with Code
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
}
