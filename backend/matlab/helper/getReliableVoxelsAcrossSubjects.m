function sortIdx=getReliableVoxelsAcrossSubjects(subnum,relType)
% N: number of voxels to get
% subnum: subject number
% relType: all or individual, whether all subjects contribute to
% reliability, or exclude the individual being tested

load(fullfile('DataFMRI',['data-science-P' num2str(subnum) '.mat']));
idx=find(meta.coordToCol);
load(fullfile('DataFMRI','AcrossSubjectReliability.mat'));

if strcmp(relType,'all')
    relData=voxelReliability;
elseif strcmp(relType,'individual')
    relData=VR{subnum};
end

[Y,tempSortIDX]=sort(relData,'descend');

[C,sortIdx,IB]=intersect(idx,commonVoxels(tempSortIDX));